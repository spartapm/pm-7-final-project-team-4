"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar, Modal } from "@/components/ui";
import { NAME_RE, type Species } from "@/lib/types";
import { track } from "@/lib/format";

export default function ProfileEditPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, updatePet, runAction, actionBusy } = useStore();
  const [species, setSpecies] = useState<Species>(pet?.species ?? "dog");
  const [name, setName] = useState(pet?.name ?? "");
  const [age, setAge] = useState(pet?.age == null ? "" : String(pet.age));
  const [photo, setPhoto] = useState(pet?.photo ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [photoPerm, setPhotoPerm] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (!pet) return;
    setSpecies(pet.species);
    setName(pet.name);
    setAge(pet.age == null ? "" : String(pet.age));
    setPhoto(pet.photo ?? "");
  }, [pet]);

  if (!hydrated || !pet) return <div className="shell" />;

  async function save() {
    const next: Record<string, string> = {};
    const n = name.trim();
    if (!n) next.name = "이름을 작성해주세요";
    else if (!NAME_RE.test(n)) next.name = "공백과 특수문자는 사용할 수 없습니다.";
    if (age !== "") {
      const a = Number(age);
      if (!Number.isInteger(a) || a < 0 || a > 99) next.age = "나이를 확인해주세요";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    const changed: string[] = [];
    if (species !== pet!.species) changed.push("species");
    if (n !== pet!.name) changed.push("name");
    if ((age === "" ? null : Number(age)) !== pet!.age) changed.push("age");
    const status = await runAction(() =>
      updatePet({
        species,
        name: n,
        age: age === "" ? null : Number(age),
        photo: photo || undefined,
      })
    );
    if (status === "error") return;
    track("profile_edit_complete", { changed_fields: changed.join(",") || "none" });
    router.back();
  }

  return (
    <PhoneShell cream>
      <div className="topbar">
        <button className="back" type="button" onClick={() => router.back()}>
          ‹
        </button>
        <h1>프로필 수정</h1>
        <button className="right" type="button" onClick={save} disabled={actionBusy}>
          {actionBusy ? <span className="spinner" /> : "저장"}
        </button>
      </div>
      <div className="hairline" />
      <div className="scroll profile">
        <div className="avatar-edit-wrap">
          <button
            type="button"
            className={`avatar-edit${photo ? " has-photo" : ""}`}
            onClick={() => {
              try {
                fileRef.current?.click();
              } catch {
                setPhotoPerm(true);
              }
            }}
          >
            <img
              className="face"
              src={photo || "/icons/camera_icon.png"}
              alt="프로필 사진"
            />
          </button>
          <input
            ref={fileRef}
            className="hidden-file"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const r = new FileReader();
              r.onerror = () => setPhotoPerm(true);
              r.onload = () => setPhoto(String(r.result));
              try {
                r.readAsDataURL(f);
              } catch {
                setPhotoPerm(true);
              }
            }}
          />
        </div>

        <div className="ob-label-row">
          <div className="ob-label">이름*</div>
          {errors.name ? <div className="field-err">{errors.name}</div> : null}
        </div>
        <input
          className={`ob-input ${errors.name ? "err" : ""}`}
          value={name}
          maxLength={10}
          onChange={(e) => setName(e.target.value.replace(/\s/g, "").slice(0, 10))}
        />

        <div className="ob-label-row">
          <div className="ob-label">나이 (선택)</div>
          {errors.age ? <div className="field-err">{errors.age}</div> : null}
        </div>
        <div className="age-row">
          <input
            inputMode="numeric"
            value={age}
            maxLength={2}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
          <span className="unit">살</span>
        </div>

        <div className="ob-label">종류*</div>
        <div className="drop-wrap">
          <button
            type="button"
            className="ob-input drop-btn"
            onClick={() => setOpen((v) => !v)}
          >
            {species === "dog" ? "강아지" : "고양이"}
            <span className="chev">{open ? "▴" : "▾"}</span>
          </button>
          {open ? (
            <div className="sort-menu drop-menu">
              <button type="button" onClick={() => { setSpecies("dog"); setOpen(false); }}>
                강아지
              </button>
              <button type="button" onClick={() => { setSpecies("cat"); setOpen(false); }}>
                고양이
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <TabBar />
      {photoPerm ? (
        <Modal
          title="설정에서 사진 접근을 허용해주세요"
          cancel="돌아가기"
          confirm="설정으로 이동"
          onCancel={() => setPhotoPerm(false)}
          onConfirm={() => {
            setPhotoPerm(false);
            setToast("브라우저 주소창 자물쇠에서 사진 권한을 허용해주세요");
            setTimeout(() => setToast(""), 2400);
          }}
        />
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </PhoneShell>
  );
}
