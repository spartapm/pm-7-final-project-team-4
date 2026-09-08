const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

type KakaoSDK = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Auth: {
    login: (opts: {
      persistAccessToken?: boolean;
      success: (res: unknown) => void;
      fail: (err: unknown) => void;
    }) => void;
  };
  API: {
    request: (opts: {
      url: string;
      success: (res: { id: number }) => void;
      fail: (err: unknown) => void;
    }) => void;
  };
};

function getKakao(): KakaoSDK | undefined {
  return (window as Window & { Kakao?: KakaoSDK }).Kakao;
}

export function hasKakaoKey() {
  return Boolean(JS_KEY);
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

export type KakaoLoginResult =
  | { ok: true; kakaoId: string }
  | { ok: false; reason: "cancel" | "fail" | "network" | "skip" };

export async function loginWithKakao(): Promise<KakaoLoginResult> {
  if (!JS_KEY) return { ok: false, reason: "skip" };
  try {
    const Kakao = await loadSdk();
    if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
    const id = await new Promise<string>((resolve, reject) => {
      Kakao.Auth.login({
        persistAccessToken: true,
        success: () => {
          Kakao.API.request({
            url: "/v2/user/me",
            success: (res) => resolve(String(res.id)),
            fail: reject,
          });
        },
        fail: reject,
      });
    });
    return { ok: true, kakaoId: id };
  } catch (err) {
    const msg = String(
      err && typeof err === "object" && "error" in err
        ? (err as { error?: string }).error
        : err
    );
    if (/cancel|access_denied|closed/i.test(msg)) return { ok: false, reason: "cancel" };
    if (/SDK load|Failed to fetch|network|NetworkError|TypeError/i.test(msg)) {
      return { ok: false, reason: "network" };
    }
    return { ok: false, reason: "fail" };
  }
}
