"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, KakaoIcon } from "@/components/ui";
import { track } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, login } = useStore();

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
          onClick={() => {
            track("sign_up_start");
            login();
            router.replace("/onboarding");
          }}
        >
          <KakaoIcon />
          카카오톡으로 시작하기
        </button>
      </div>
    </PhoneShell>
  );
}
