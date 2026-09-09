const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Auth: {
    authorize: (opts: { redirectUri: string }) => void;
  };
};

function getKakao(): KakaoSDK | undefined {
  return (window as Window & { Kakao?: KakaoSDK }).Kakao;
}

export function hasKakaoKey() {
  return Boolean(JS_KEY);
}

export function kakaoRedirectUri() {
  return `${window.location.origin}/auth/kakao`;
}

function loadSdk(): Promise<KakaoSDK> {
  return new Promise((resolve, reject) => {
    const existing = getKakao();
    if (existing) {
      resolve(existing);
      return;
    }
    const tag = document.createElement("script");
    tag.src = SDK;
    tag.async = true;
    tag.onload = () => {
      const sdk = getKakao();
      if (!sdk) reject(new Error("Kakao SDK"));
      else resolve(sdk);
    };
    tag.onerror = () => reject(new Error("Kakao SDK load"));
    document.head.appendChild(tag);
  });
}

export type KakaoStartResult =
  | { ok: true }
  | { ok: false; reason: "cancel" | "fail" | "network" | "skip" };

export async function startKakaoLogin(): Promise<KakaoStartResult> {
  if (!JS_KEY) return { ok: false, reason: "skip" };
  try {
    const Kakao = await loadSdk();
    if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
    Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri() });
    return { ok: true };
  } catch (err) {
    const msg = String(err);
    if (/SDK load|Failed to fetch|network|NetworkError/i.test(msg)) {
      return { ok: false, reason: "network" };
    }
    return { ok: false, reason: "fail" };
  }
}
