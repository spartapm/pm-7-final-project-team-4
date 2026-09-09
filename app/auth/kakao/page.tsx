"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell } from "@/components/ui";
import { kakaoRedirectUri } from "@/lib/kakao";
import { track } from "@/lib/format";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const { hydrated, login } = useStore();
  const [hint, setHint] = useState("로그인 중...");

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const code = params.get("code");
    if (err === "access_denied") {
      track("sign_up_fail", { fail_reason: "auth_cancel" });
      router.replace("/?kakao=cancel");
      return;
    }
    if (err || !code) {
      track("sign_up_fail", { fail_reason: "auth_error" });
      router.replace("/?kakao=fail");
      return;
    }

    const redirectUri = kakaoRedirectUri();
    void fetch("/api/kakao/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { kakaoId?: string; error?: string };
        if (!res.ok || !data.kakaoId) throw new Error(data.error || "token");
        login(data.kakaoId);
      })
      .catch(() => {
        track("sign_up_fail", { fail_reason: "auth_error" });
        setHint("로그인에 실패했어요. 다시 시도해주세요");
        router.replace("/?kakao=fail");
      });
  }, [hydrated, login, router]);

  return (
    <PhoneShell bg="/bg/onboarding_bg_01.png">
      <div className="login">
        <p className="login-hint">{hint}</p>
      </div>
    </PhoneShell>
  );
}
