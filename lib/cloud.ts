import type { ListItem, Memory, Pet } from "./types";
import { getSupabase, isMissingTable } from "./supabase";

export type CloudAccount = {
  id: string;
  pet: Pet | null;
  items: ListItem[];
  memories: Memory[];
  seeded: { before: boolean; after: boolean };
  loginAt: number | null;
};

export type CloudStatus = "ok" | "missing-table" | "error" | "off";

function toIso(ms: number) {
  return new Date(ms).toISOString();
}

function fromIso(iso: string | null | undefined, fallback = Date.now()) {
  if (!iso) return fallback;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? fallback : t;
}

export async function pullAccount(accountId: string): Promise<{
  status: CloudStatus;
  data?: CloudAccount;
  message?: string;
}> {
  const sb = getSupabase();
  if (!sb) return { status: "off" };

  const accountRes = await sb
    .from("accounts")
    .select("id, login_at, seeded_before, seeded_after")
    .eq("id", accountId)
    .maybeSingle();
  if (accountRes.error) {
    if (isMissingTable(accountRes.error)) return { status: "missing-table" };
    return { status: "error", message: accountRes.error.message };
  }
  if (!accountRes.data) {
    return {
      status: "ok",
      data: {
        id: accountId,
        pet: null,
        items: [],
        memories: [],
        seeded: { before: false, after: false },
        loginAt: null,
      },
    };
  }

  const [petRes, itemRes, memRes] = await Promise.all([
    sb.from("pets").select("*").eq("account_id", accountId).maybeSingle(),
    sb.from("list_items").select("*").eq("account_id", accountId),
    sb.from("memories").select("*").eq("account_id", accountId),
  ]);

  for (const res of [petRes, itemRes, memRes]) {
    if (res.error) {
      if (isMissingTable(res.error)) return { status: "missing-table" };
      return { status: "error", message: res.error.message };
    }
  }

  const petRow = petRes.data;
  const pet: Pet | null = petRow
    ? {
        species: petRow.species as Pet["species"],
        name: petRow.name as string,
        age: (petRow.age as number | null) ?? null,
        photo: (petRow.photo as string | null) || undefined,
        journey: petRow.journey as Pet["journey"],
      }
    : null;

  const items: ListItem[] = (itemRes.data ?? []).map((row) => ({
    id: row.id as string,
    journey: row.journey as ListItem["journey"],
    title: row.title as string,
    createdAt: fromIso(row.created_at as string),
    isExample: Boolean(row.is_example),
    draft: (row.draft as ListItem["draft"]) || undefined,
  }));

  const memories: Memory[] = (memRes.data ?? []).map((row) => ({
    id: row.id as string,
    itemId: row.item_id as string,
    journey: row.journey as Memory["journey"],
    title: row.title as string,
    story: row.story as string,
    date: row.date as string,
    photos: (row.photos as string[]) ?? [],
    createdAt: fromIso(row.created_at as string),
    updatedAt: fromIso(row.updated_at as string),
  }));

  return {
    status: "ok",
    data: {
      id: accountId,
      pet,
      items,
      memories,
      seeded: {
        before: Boolean(accountRes.data.seeded_before),
        after: Boolean(accountRes.data.seeded_after),
      },
      loginAt: accountRes.data.login_at ? fromIso(accountRes.data.login_at as string) : null,
    },
  };
}

export async function pushAccount(input: CloudAccount): Promise<CloudStatus> {
  const sb = getSupabase();
  if (!sb) return "off";

  const accountRes = await sb.from("accounts").upsert({
    id: input.id,
    login_at: input.loginAt ? toIso(input.loginAt) : null,
    seeded_before: input.seeded.before,
    seeded_after: input.seeded.after,
    updated_at: new Date().toISOString(),
  });
  if (accountRes.error) {
    if (isMissingTable(accountRes.error)) return "missing-table";
    console.warn("[supabase] accounts", accountRes.error.message);
    return "error";
  }

  if (input.pet) {
    const petRes = await sb.from("pets").upsert({
      account_id: input.id,
      species: input.pet.species,
      name: input.pet.name,
      age: input.pet.age,
      photo: input.pet.photo ?? null,
      journey: input.pet.journey,
      updated_at: new Date().toISOString(),
    });
    if (petRes.error) {
      console.warn("[supabase] pets", petRes.error.message);
      return "error";
    }
  }

  const [remoteItems, remoteMems] = await Promise.all([
    sb.from("list_items").select("id").eq("account_id", input.id),
    sb.from("memories").select("id").eq("account_id", input.id),
  ]);
  if (remoteItems.error || remoteMems.error) {
    const err = remoteItems.error || remoteMems.error;
    if (isMissingTable(err)) return "missing-table";
    return "error";
  }

  const keepItems = new Set(input.items.map((it) => it.id));
  const staleItems = (remoteItems.data ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keepItems.has(id));
  if (staleItems.length) await sb.from("list_items").delete().in("id", staleItems);

  const keepMems = new Set(input.memories.map((m) => m.id));
  const staleMems = (remoteMems.data ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keepMems.has(id));
  if (staleMems.length) await sb.from("memories").delete().in("id", staleMems);

  if (input.items.length) {
    const itemRes = await sb.from("list_items").upsert(
      input.items.map((it) => ({
        id: it.id,
        account_id: input.id,
        journey: it.journey,
        title: it.title,
        created_at: toIso(it.createdAt),
        is_example: it.isExample,
        draft: it.draft ?? null,
      }))
    );
    if (itemRes.error) {
      console.warn("[supabase] list_items", itemRes.error.message);
      return "error";
    }
  }

  if (input.memories.length) {
    const memRes = await sb.from("memories").upsert(
      input.memories.map((m) => ({
        id: m.id,
        account_id: input.id,
        item_id: m.itemId,
        journey: m.journey,
        title: m.title,
        story: m.story,
        date: m.date,
        photos: m.photos,
        created_at: toIso(m.createdAt),
        updated_at: toIso(m.updatedAt),
      }))
    );
    if (memRes.error) {
      console.warn("[supabase] memories", memRes.error.message);
      return "error";
    }
  }

  return "ok";
}

export async function deleteAccount(accountId: string): Promise<CloudStatus> {
  const sb = getSupabase();
  if (!sb) return "off";
  const res = await sb.from("accounts").delete().eq("id", accountId);
  if (res.error) {
    if (isMissingTable(res.error)) return "missing-table";
    console.warn("[supabase] delete account", res.error.message);
    return "error";
  }
  return "ok";
}
