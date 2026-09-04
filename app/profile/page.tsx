"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar, Modal } from "@/components/ui";
import { SPECIES_KO, track } from "@/lib/format";
import type { Journey } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, switchJourney, logout, withdraw } = useStore();
  const [modal, setModal] = useState<"mode" | "logout" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) track("profile_view", { journey_type: pet.journey });
  }, [pet]);

  if (!hydrated || !pet) return <div className="shell" />;

  const target: Journey = pet.journey === "before" ? "after" : "before";
  const ageText = pet.age == null ? "" : `${pet.age}살`;
  const sub = ageText ? `${SPECIES_KO[pet.species]} / ${ageText}` : SPECIES_KO[pet.species];

  return (
    <PhoneShell cream>
      <h1 className="page-title">프로필</h1>
      <div className="scroll profile">
        <div className="p-card">
          <button className="edit" type="button" onClick={() => router.push("/profile/edit")}>
            <img src="/icons/profile_modify_icon.png" alt="수정" />
          </button>
          <div className={`avatar${pet.journey === "after" ? " after" : ""}`}>
            {pet.journey === "after" && !pet.photo ? (
              <img className="wings-solo" src="/icons/profile_wings.png" alt="" />
            ) : (
              <>
                {pet.journey === "after" ? (
                  <img className="wings" src="/icons/profile_wings.png" alt="" />
                ) : null}
                <img className="face" src={pet.photo || "/icons/profile_default.png"} alt="" />
              </>
            )}
          </div>
          <div className="p-meta">
            <p className={`name ${pet.name.length >= 7 ? "long" : ""}`}>{pet.name} 보호자</p>
            <p className="sub">{sub}</p>
          </div>
        </div>

        <div className="seg">
          <button
            type="button"
            className={pet.journey === "before" ? "on" : ""}
            onClick={() => {
              if (pet.journey !== "before") setModal("mode");
            }}
          >
            아이와 함께한 날
          </button>
          <button
            type="button"
            className={pet.journey === "after" ? "on" : ""}
            onClick={() => {
              if (pet.journey !== "after") setModal("mode");
            }}
          >
            아이를 추억한 날
          </button>
        </div>

        <div className="menu-list">
          <button type="button" onClick={() => setModal("logout")}>
            로그아웃
          </button>
          <button type="button" onClick={() => setModal("leave")}>
            회원 탈퇴
          </button>
        </div>
      </div>
      <TabBar />

      {modal === "mode" && pet.journey === "before" ? (
        <Modal
          title="아이를 추억한 날로 변경할까요?"
          body={
            <>
              <b>&lt;추억 리스트로 변경&gt;</b>
              {"\n"}떠나보낸 아이를 추억할 수 있는 공간으로 이동해요.
              {"\n"}이동 후에도 버킷 리스트와 모든 기록을 볼 수 있어요.
            </>
          }
          confirm="변경하기"
          busy={busy}
          onCancel={() => {
            track("journey_switch_cancel");
            setModal(null);
          }}
          onConfirm={() => {
            setBusy(true);
            switchJourney(target);
            track("journey_switch_confirm", { from_type: "before", to_type: "after" });
            setBusy(false);
            setModal(null);
          }}
        />
      ) : null}

      {modal === "mode" && pet.journey === "after" ? (
        <Modal
          title="아이와 함께한 날로 변경할까요?"
          body={
            <>
              <b>&lt;버킷 리스트로 변경&gt;</b>
              {"\n"}생전에 아이와 함께했던 공간으로 이동해요.
              {"\n"}이동 후에는 버킷 리스트와 생전 기록만 볼 수 있어요.
              {"\n"}현재 공간에서 작성한 내용은 볼 수 없어요.
            </>
          }
          confirm="변경하기"
          busy={busy}
          onCancel={() => {
            track("journey_switch_cancel");
            setModal(null);
          }}
          onConfirm={() => {
            setBusy(true);
            switchJourney(target);
            track("journey_switch_confirm", { from_type: "after", to_type: "before" });
            setBusy(false);
            setModal(null);
          }}
        />
      ) : null}

      {modal === "logout" ? (
        <Modal
          title="로그아웃 할까요?"
          confirm="로그아웃"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            logout();
            router.replace("/");
          }}
        />
      ) : null}

      {modal === "leave" ? (
        <Modal
          title="회원 탈퇴를 진행할까요?"
          body={"회원 탈퇴 시 계정 및 데이터는 \n영구 삭제되며 복구할 수 없어요!"}
          confirm="탈퇴하기"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            withdraw();
            router.replace("/");
          }}
        />
      ) : null}
    </PhoneShell>
  );
}
