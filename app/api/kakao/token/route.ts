import { NextResponse } from "next/server";

const REST_KEY =
  process.env.KAKAO_REST_API_KEY ||
  process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
  "2983434411059e335a16f79d6ca52361";

export async function POST(req: Request) {
  const { code, redirectUri } = (await req.json()) as {
    code?: string;
    redirectUri?: string;
  };
  if (!code || !redirectUri) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: REST_KEY,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!token.access_token) {
    return NextResponse.json(
      { error: token.error_description || token.error || "token" },
      { status: 400 }
    );
  }

  const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = (await meRes.json()) as { id?: number };
  if (!me.id) {
    return NextResponse.json({ error: "user" }, { status: 400 });
  }
  return NextResponse.json({ kakaoId: String(me.id) });
}
