"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell } from "@/components/ui";
import { kakaoRedirectUri } from "@/lib/kakao";
import { analytics } from "@/lib/events";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const { hydrated, login, loggedIn, pet } = useStore();
  const [hint, setHint] = useState("로그인 중...");
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (loggedIn) {
      router.replace(pet ? "/home" : "/onboarding");
      return;
    }
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const code = params.get("code");
    if (err === "access_denied") {
      analytics.sign_up_fail("auth_cancel");
      router.replace("/?kakao=cancel");
      return;
    }
    if (err || !code) {
      analytics.sign_up_fail("auth_error");
      router.replace("/?kakao=fail");
      return;
    }

    const redirectUri = kakaoRedirectUri();
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);

    void fetch("/api/kakao/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as { kakaoId?: string; error?: string };
        if (!res.ok || !data.kakaoId) throw new Error(data.error || "token");
        login(data.kakaoId);
      })
      .catch((err: unknown) => {
        const aborted = err instanceof DOMException && err.name === "AbortError";
        analytics.sign_up_fail(aborted || !navigator.onLine ? "network" : "auth_error");
        setHint("로그인에 실패했어요. 다시 시도해주세요");
        router.replace("/?kakao=fail");
      })
      .finally(() => window.clearTimeout(timer));
  }, [hydrated, loggedIn, pet, login, router]);

  return (
    <PhoneShell bg="/bg/onboarding_bg_01.png">
      <div className="login">
        <p className="login-hint">{hint}</p>
      </div>
    </PhoneShell>
  );
}
