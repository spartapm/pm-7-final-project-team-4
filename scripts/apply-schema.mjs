/**
 * Apply supabase/schema.sql over the Postgres wire protocol.
 * Uses Node tls + crypto only (no `pg` package) so it can run when disk is full.
 */
import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

const env = loadEnv();
const databaseUrl =
  process.env.DATABASE_URL ||
  env.DATABASE_URL ||
  "";

if (!databaseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const user = decodeURIComponent(parsed.username);
const password = decodeURIComponent(parsed.password);
const database = parsed.pathname.replace(/^\//, "") || "postgres";
const host = parsed.hostname;
const port = Number(parsed.port || 5432);

function int32(n) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
}

function concat(...parts) {
  return Buffer.concat(parts);
}

function xor(a, b) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest();
}

function parseServerFirst(msg) {
  const parts = Object.fromEntries(msg.split(",").map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)];
  }));
  return {
    nonce: parts.r,
    salt: Buffer.from(parts.s, "base64"),
    iterations: Number(parts.i),
  };
}

function scramProof(password, clientFirstBare, serverFirstRaw, serverNonce) {
  const { salt, iterations } = parseServerFirst(serverFirstRaw);
  const salted = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const clientKey = hmac(salted, "Client Key");
  const storedKey = sha256(clientKey);
  const clientFinalWithoutProof = `c=biws,r=${serverNonce}`;
  const authMessage = `${clientFirstBare},${serverFirstRaw},${clientFinalWithoutProof}`;
  const clientSig = hmac(storedKey, authMessage);
  const proof = xor(clientKey, clientSig).toString("base64");
  return `${clientFinalWithoutProof},p=${proof}`;
}

class Pg {
  constructor(opts) {
    this.opts = opts;
    this.buf = Buffer.alloc(0);
    this.messages = [];
    this.waiters = [];
    this.socket = null;
    this.clientNonce = crypto.randomBytes(24).toString("base64");
    this.clientFirstBare = `n=,r=${this.clientNonce}`;
  }

  sendStartup() {
    const params = Buffer.from(
      `user\0${this.opts.user}\0database\0${this.opts.database}\0client_encoding\0UTF8\0\0`
    );
    const body = concat(int32(196608), params);
    this.socket.write(concat(int32(4 + body.length), body));
  }

  send(type, payload) {
    const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    this.socket.write(concat(Buffer.from(type), int32(4 + body.length), body));
  }

  pushMessage(msg) {
    if (this.waiters.length) this.waiters.shift()(msg);
    else this.messages.push(msg);
  }

  nextMessage() {
    if (this.messages.length) return Promise.resolve(this.messages.shift());
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  onData(chunk) {
    this.buf = concat(this.buf, chunk);
    while (this.buf.length >= 5) {
      const type = String.fromCharCode(this.buf[0]);
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < 1 + len) break;
      const payload = this.buf.subarray(5, 1 + len);
      this.buf = this.buf.subarray(1 + len);
      this.pushMessage({ type, payload });
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      const raw = net.connect(
        {
          host: this.opts.connectHost || this.opts.host,
          port: this.opts.port,
          family: this.opts.family,
        },
        () => {
          const req = Buffer.alloc(8);
          req.writeInt32BE(8, 0);
          req.writeInt32BE(80877103, 4);
          raw.write(req);
        }
      );
      raw.setTimeout(20000, () => {
        raw.destroy(new Error("timeout"));
      });
      raw.once("error", reject);
      raw.once("data", (chunk) => {
        if (chunk[0] !== 0x53) {
          reject(new Error(`server refused SSL (${chunk[0]})`));
          raw.destroy();
          return;
        }
        const socket = tls.connect(
          {
            socket: raw,
            servername: this.opts.host,
            rejectUnauthorized: false,
          },
          () => this.sendStartup()
        );
        this.socket = socket;
        socket.on("data", (c) => this.onData(c));
        socket.on("error", reject);
        this.authenticate().then(resolve).catch(reject);
      });
    });
  }

  parseError(payload) {
    const fields = {};
    let i = 0;
    while (i < payload.length) {
      const code = String.fromCharCode(payload[i]);
      if (code === "\0") break;
      i += 1;
      const end = payload.indexOf(0, i);
      fields[code] = payload.subarray(i, end).toString("utf8");
      i = end + 1;
    }
    return fields.M || fields.C || "postgres error";
  }

  async authenticate() {
    while (true) {
      const msg = await this.nextMessage();
      if (msg.type === "E") throw new Error(this.parseError(msg.payload));
      if (msg.type === "R") {
        const code = msg.payload.readInt32BE(0);
        if (code === 0) continue;
        if (code === 3) {
          this.send("p", `${this.opts.password}\0`);
          continue;
        }
        if (code === 5) {
          const salt = msg.payload.subarray(4, 8);
          const inner = crypto
            .createHash("md5")
            .update(this.opts.password + this.opts.user)
            .digest("hex");
          const hashed = crypto.createHash("md5").update(inner).update(salt).digest("hex");
          this.send("p", `md5${hashed}\0`);
          continue;
        }
        if (code === 10) {
          const mechs = msg.payload.subarray(4).toString("utf8");
          if (!mechs.includes("SCRAM-SHA-256")) {
            throw new Error(`unsupported SASL: ${mechs}`);
          }
          const first = `n,,${this.clientFirstBare}`;
          const payload = concat(
            Buffer.from("SCRAM-SHA-256\0"),
            int32(Buffer.byteLength(first)),
            Buffer.from(first)
          );
          this.send("p", payload);
          continue;
        }
        if (code === 11) {
          const serverFirst = msg.payload.subarray(4).toString("utf8");
          const { nonce } = parseServerFirst(serverFirst);
          if (!nonce.startsWith(this.clientNonce)) {
            throw new Error("SASL nonce mismatch");
          }
          const final = scramProof(
            this.opts.password,
            this.clientFirstBare,
            serverFirst,
            nonce
          );
          this.send("p", final);
          continue;
        }
        if (code === 12) continue;
        throw new Error(`auth method ${code}`);
      }
      if (msg.type === "Z") return;
    }
  }

  async query(text) {
    this.send("Q", `${text}\0`);
    const notices = [];
    while (true) {
      const msg = await this.nextMessage();
      if (msg.type === "E") throw new Error(this.parseError(msg.payload));
      if (msg.type === "N") {
        notices.push(this.parseError(msg.payload));
        continue;
      }
      if (msg.type === "Z") return notices;
    }
  }

  end() {
    try {
      this.send("X", Buffer.alloc(0));
    } catch {
      /* ignore */
    }
    this.socket?.destroy();
  }
}

const refMatch = host.match(/^db\.([^.]+)\.supabase\.co$/);
const ref = refMatch?.[1];
const targets = [
  {
    host,
    connectHost: "2406:da12:5ca:b703:67b3:2834:b72a:64f0",
    port,
    user,
    family: 6,
    label: "direct ipv6",
  },
];
if (ref) {
  for (const [prefix, region] of [
    ["aws-0", "ap-northeast-2"],
    ["aws-1", "ap-northeast-2"],
    ["aws-0", "ap-northeast-1"],
  ]) {
    for (const p of [6543, 5432]) {
      targets.push({
        host: `${prefix}-${region}.pooler.supabase.com`,
        port: p,
        user: `postgres.${ref}`,
        family: 4,
        label: `pooler ${prefix} ${region}:${p}`,
      });
    }
  }
}

let lastErr = null;
for (const t of targets) {
  const client = new Pg({
    host: t.host,
    connectHost: t.connectHost,
    port: t.port,
    user: t.user,
    password,
    database,
    family: t.family,
  });
  try {
    process.stderr.write(`connecting ${t.label} ${t.host}:${t.port}…\n`);
    await client.connect();
    await client.query(sql);
    const rows = [];
    client.send("Q", "select tablename from pg_tables where schemaname='public' order by 1;\0");
    while (true) {
      const msg = await client.nextMessage();
      if (msg.type === "E") throw new Error(client.parseError(msg.payload));
      if (msg.type === "D") {
        // DataRow: int16 count, then (int32 len + bytes)* 
        let o = 2;
        const len = msg.payload.readInt32BE(o);
        o += 4;
        rows.push(msg.payload.subarray(o, o + len).toString("utf8"));
      }
      if (msg.type === "Z") break;
    }
    client.end();
    console.log("ok tables:", rows.join(", ") || "(none)");
    process.exit(0);
  } catch (err) {
    lastErr = err;
    process.stderr.write(`  fail: ${err.message}\n`);
    client.end();
  }
}

console.error(lastErr?.message || "all connection targets failed");
process.exit(1);
