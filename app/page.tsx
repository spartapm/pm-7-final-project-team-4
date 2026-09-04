"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, KakaoIcon } from "@/components/ui";
import { loginWithKakao } from "@/lib/kakao";
import { track } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, login } = useStore();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (loggedIn && pet) router.replace("/home");
    else if (loggedIn && !pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  if (!hydrated) return <div className="shell" />;

  return (
    <PhoneShell bg="/bg/onboarding_bg_01.png">
      <div className="login">
        <img className="login-logo" src="/icons/logo_text.png" alt="Pet Memory" />
        <button
          className="kakao-btn"
          type="button"
          disabled={busy}
          onClick={async () => {
            track("sign_up_start");
            setHint("");
            setBusy(true);
            const res = await loginWithKakao();
            setBusy(false);
            if (res.ok) {
              login(res.kakaoId);
              return;
            }
            if (res.reason === "skip") {
              login();
              return;
            }
            setHint("로그인에 실패했어요. 다시 시도해주세요");
          }}
        >
          {busy ? <span className="spinner" /> : <KakaoIcon />}
          {busy ? "로그인 중..." : "카카오톡으로 시작하기"}
        </button>
        {hint ? <p className="login-hint">{hint}</p> : null}
      </div>
    </PhoneShell>
  );
}
