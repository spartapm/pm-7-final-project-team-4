"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, KakaoIcon } from "@/components/ui";
import { startKakaoLogin } from "@/lib/kakao";
import { track } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, login } = useStore();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [localDev, setLocalDev] = useState(false);

  useEffect(() => {
    setLocalDev(window.location.hostname === "localhost");
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const q = new URLSearchParams(window.location.search).get("kakao");
    if (q === "fail") setHint("로그인에 실패했어요. 다시 시도해주세요");
    if (q === "cancel") setHint("로그인을 취소했어요. 다시 시도해주세요");
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (loggedIn && pet) router.replace("/home");
    else if (loggedIn && !pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  if (!hydrated) return <div className="shell" />;

  return (
    <PhoneShell bg="/bg/onboarding_bg_01.png">
      <div className="login">
        <img className="login-logo" src="/icons/main_logo_text.png" alt="Pet Memory" />
        <button
          className="kakao-btn"
          type="button"
          disabled={busy}
          onClick={async () => {
            track("sign_up_start");
            setHint("");
            setBusy(true);
            const res = await startKakaoLogin();
            if (res.ok) return;
            setBusy(false);
            if (res.reason === "skip") {
              login();
              return;
            }
            track("sign_up_fail", {
              fail_reason:
                res.reason === "cancel" ? "auth_cancel" : res.reason === "network" ? "network" : "auth_error",
            });
            setHint("로그인에 실패했어요. 다시 시도해주세요");
          }}
        >
          {busy ? <span className="spinner" /> : <KakaoIcon />}
          {busy ? "로그인 중..." : "카카오톡으로 시작하기"}
        </button>
        {hint ? <p className="login-hint">{hint}</p> : null}
        {localDev ? (
          <button
            className="login-hint"
            type="button"
            style={{ marginTop: 16, textDecoration: "underline" }}
            onClick={() => login()}
          >
            로컬로 들어가기
          </button>
        ) : null}
      </div>
    </PhoneShell>
  );
}
