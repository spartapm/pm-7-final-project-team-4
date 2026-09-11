"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell } from "@/components/ui";
import { NAME_RE, type Journey, type Species } from "@/lib/types";
import { analytics } from "@/lib/events";

export default function OnboardingPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, completeOnboarding, runAction } = useStore();
  const [species, setSpecies] = useState<Species | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [journey, setJourney] = useState<Journey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (pet) router.replace("/home");
  }, [hydrated, loggedIn, pet, router]);

  async function submit() {
    const next: Record<string, string> = {};
    if (!species) next.species = "종을 선택해주세요";
    const n = name.trim();
    if (!n) next.name = "이름을 작성해주세요";
    else if (!NAME_RE.test(n)) next.name = "공백과 특수문자는 사용할 수 없습니다.";
    if (age !== "") {
      const a = Number(age);
      if (!Number.isInteger(a) || a < 0 || a > 99) next.age = "나이를 확인해주세요";
    }
    if (!journey) next.journey = "여정을 선택해주세요";
    setErrors(next);
    if (Object.keys(next).length) {
      analytics.onboarding_error(
        next.species ? "species" : next.name ? "name" : next.journey ? "journey" : "name"
      );
      return;
    }
    setBusy(true);
    const status = await runAction(() =>
      completeOnboarding({
        species: species!,
        name: n,
        age: age === "" ? null : Number(age),
        journey: journey!,
      })
    );
    if (status === "error") {
      setBusy(false);
      return;
    }
    analytics.onboarding_complete(species!, journey!);
  }

  if (!hydrated) return <div className="shell" />;

  return (
    <PhoneShell bg="/bg/onboarding_bg_02.png">
      <div className="ob">
        <h1>반려동물 정보 입력</h1>
        <p className="sub">어떤 아이와 함께 하시나요?</p>

        <div className="ob-label-row">
          <div className="ob-label">종류*</div>
          {errors.species ? <div className="field-err">{errors.species}</div> : null}
        </div>
        <div className="species">
          <button
            type="button"
            className={`species-card ${species === "dog" ? "on" : ""} ${errors.species ? "err" : ""}`}
            onClick={() => {
              setSpecies("dog");
              setErrors((e) => ({ ...e, species: "" }));
              analytics.onboarding_pet_type_select("dog");
            }}
          >
            <div className="pic">
              <img src="/icons/dog_img.png" alt="" />
            </div>
            <span>강아지</span>
          </button>
          <button
            type="button"
            className={`species-card ${species === "cat" ? "on" : ""} ${errors.species ? "err" : ""}`}
            onClick={() => {
              setSpecies("cat");
              setErrors((e) => ({ ...e, species: "" }));
              analytics.onboarding_pet_type_select("cat");
            }}
          >
            <div className="pic">
              <img src="/icons/cat_img.png" alt="" />
            </div>
            <span>고양이</span>
          </button>
        </div>

        <div className="ob-label-row">
          <div className="ob-label">이름*</div>
          {errors.name ? <div className="field-err">{errors.name}</div> : null}
        </div>
        <input
          className={`ob-input ${errors.name ? "err" : ""}`}
          placeholder="아이의 이름을 적어주세요. (10자 이내, 특수문자/공백 제외)"
          value={name}
          maxLength={10}
          onChange={(e) => {
            const v = e.target.value.replace(/\s/g, "").slice(0, 10);
            setName(v);
            if (v && NAME_RE.test(v)) setErrors((err) => ({ ...err, name: "" }));
          }}
        />

        <div className="ob-label-row age-head">
          <div className="ob-label">
            나이 <span className="opt">(선택)</span>
          </div>
          <div className="age-row">
            <input
              inputMode="numeric"
              value={age}
              maxLength={2}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                setAge(v);
                if (v === "") {
                  setErrors((err) => ({ ...err, age: "" }));
                  return;
                }
                const a = Number(v);
                if (Number.isInteger(a) && a >= 0 && a <= 99) {
                  setErrors((err) => ({ ...err, age: "" }));
                }
              }}
            />
            <span className="unit">살</span>
          </div>
          {errors.age ? <div className="field-err">{errors.age}</div> : null}
        </div>

        <div className="ob-label-row">
          <div className="ob-label">함께하는 여정*</div>
          {errors.journey ? <div className="field-err">{errors.journey}</div> : null}
        </div>
        <div className="journey-btns">
          <button
            type="button"
            className={`${journey === "before" ? "on" : ""} ${errors.journey ? "err" : ""}`}
            onClick={() => {
              setJourney("before");
              setErrors((e) => ({ ...e, journey: "" }));
            }}
          >
            아이와 함께하고 있어요.
          </button>
          <button
            type="button"
            className={`${journey === "after" ? "on" : ""} ${errors.journey ? "err" : ""}`}
            onClick={() => {
              setJourney("after");
              setErrors((e) => ({ ...e, journey: "" }));
            }}
          >
            아이를 추억하고 있어요.
          </button>
        </div>

        <button className="ob-done" type="button" onClick={submit} disabled={busy}>
          {busy ? <span className="spinner" /> : "완료하기"}
        </button>
      </div>
    </PhoneShell>
  );
}
