"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, Calendar, Modal } from "@/components/ui";
import { todayDots, track } from "@/lib/format";
import { resizePhoto } from "@/lib/image";

function RecordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const itemId = sp.get("itemId");
  const memoryId = sp.get("memoryId");
  const entry = sp.get("entry") === "memory" ? "memory" : "list";

  const {
    hydrated,
    loggedIn,
    pet,
    items,
    memories,
    saveDraft,
    completeNew,
    updateMemory,
    isSessionValid,
    parkForRelogin,
  } = useStore();

  const item = items.find((it) => it.id === itemId);
  const memory = memories.find((m) => m.id === memoryId);
  const isEdit = Boolean(memory);

  const initial = useMemo(() => {
    if (memory) {
      return {
        title: memory.title,
        story: memory.story,
        date: memory.date,
        photos: memory.photos,
      };
    }
    if (item?.draft) return item.draft;
    return {
      title: item?.title ?? "",
      story: "",
      date: todayDots(),
      photos: [] as string[],
    };
  }, [item, memory]);

  const [title, setTitle] = useState(initial.title);
  const [story, setStory] = useState(initial.story);
  const [date, setDate] = useState(initial.date);
  const [photos, setPhotos] = useState<string[]>(initial.photos);
  const [cal, setCal] = useState(false);
  const [leave, setLeave] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fail, setFail] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [interacted, setInteracted] = useState<Record<string, boolean>>({});
  const [photoPerm, setPhotoPerm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    track("record_edit_view", { entry_point: entry });
  }, [entry]);

  useEffect(() => {
    setTitle(initial.title);
    setStory(initial.story);
    setDate(initial.date);
    setPhotos(initial.photos);
  }, [initial]);

  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(140, el.scrollHeight)}px`;
  }, [story]);

  const dirty =
    title !== initial.title ||
    story !== initial.story ||
    date !== initial.date ||
    photos.join() !== initial.photos.join();

  function mark(field: string) {
    if (interacted[field]) return;
    setInteracted((s) => ({ ...s, [field]: true }));
    track("record_field_interact", { field_name: field });
  }

  function parkIfExpired() {
    if (isSessionValid()) return false;
    const draft = { title, story, date, photos };
    if (itemId) parkForRelogin(itemId, draft);
    else if (memory) {
      updateMemory(memory.id, {
        title: title.trim() || memory.title,
        story: story.trim() || memory.story,
        date,
        photos,
      });
      parkForRelogin();
    } else {
      parkForRelogin();
    }
    router.replace("/");
    return true;
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = 5 - photos.length;
    const list = Array.from(files).slice(0, room);
    for (const file of list) {
      try {
        const dataUrl = await resizePhoto(file);
        setPhotos((p) => {
          if (p.length >= 5) return p;
          const next = [...p, dataUrl];
          track("record_photo_add", { photo_count: next.length });
          return next;
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setPhotoPerm(true);
          return;
        }
        setToast("사진을 불러오지 못했어요");
        setTimeout(() => setToast(""), 1600);
      }
    }
  }

  function goBack() {
    if (dirty) setLeave(true);
    else router.back();
  }

  function doTempSave() {
    if (parkIfExpired()) return;
    if (!itemId) {
      router.back();
      return;
    }
    saveDraft(itemId, { title, story, date, photos });
    setToast("임시 저장을 완료했어요!");
    setTimeout(() => setToast(""), 1600);
  }

  function doComplete() {
    if (parkIfExpired()) return;
    if (!title.trim() || !story.trim()) {
      setFail(true);
      track("record_complete_fail", { fail_reason: "validation" });
      return;
    }
    setBusy(true);
    try {
      if (isEdit && memory) {
        updateMemory(memory.id, { title: title.trim(), story: story.trim(), date, photos });
      } else if (itemId) {
        completeNew(itemId, { title: title.trim(), story: story.trim(), date, photos });
      }
      setSaved(true);
    } catch {
      setFail(true);
      track("record_complete_fail", { fail_reason: "server" });
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated || !pet) return <div className="shell" />;
  if (!item && !memory && !saved && !fail) {
    return (
      <PhoneShell cream>
        <div className="topbar">
          <button className="back" type="button" onClick={() => router.back()}>
            ‹
          </button>
          <h1>기록</h1>
          <div />
        </div>
        <p style={{ padding: 24 }}>기록을 찾을 수 없어요.</p>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell cream>
      <div className="topbar">
        <button className="back" type="button" onClick={goBack}>
          ‹
        </button>
        <h1>기록</h1>
        <div />
      </div>
      <div className="form-page">
      <div className="scroll form">
        <label className="lbl">날짜</label>
        <input
          type="text"
          readOnly
          value={date}
          placeholder="0000.00.00"
          onClick={() => {
            mark("date");
            setCal(true);
          }}
        />
        <label className="lbl">제목</label>
        <input
          type="text"
          value={title}
          maxLength={50}
          placeholder="(리스트 제목 - 수정 가능)"
          onChange={(e) => {
            mark("title");
            setTitle(e.target.value.slice(0, 50));
          }}
        />
        <label className="lbl">우리의 이야기</label>
        <textarea
          ref={storyRef}
          value={story}
          maxLength={1000}
          placeholder="소중한 순간들을 기록해보세요. (200자 내)"
          onChange={(e) => {
            mark("story");
            setStory(e.target.value.slice(0, 1000));
          }}
        />
        <label className="lbl">사진 추가</label>
        <div className="photos">
          {photos.length < 5 ? (
            <button
              className="photo-add"
              type="button"
              onClick={() => {
                mark("photo");
                try {
                  fileRef.current?.click();
                } catch {
                  setPhotoPerm(true);
                }
              }}
            >
              +
            </button>
          ) : null}
          {photos.map((src, i) => (
            <div key={i} className="photo-slot">
              <img src={src} alt="" />
              <button className="x" type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          className="hidden-file"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="form-actions">
        <button className="btn-ghost" type="button" disabled={busy} onClick={doTempSave}>
          임시 저장
        </button>
        <button className="btn-fill" type="button" disabled={busy} onClick={doComplete}>
          {busy ? <span className="spinner" /> : "완료"}
        </button>
      </div>
      </div>
      {cal ? <Calendar value={date} onPick={setDate} onClose={() => setCal(false)} /> : null}
      {leave ? (
        <Modal
          title={"변경된 내용이 있어요.\n임시 저장할까요?"}
          cancel="나가기"
          confirm="저장하고 나가기"
          onCancel={() => router.back()}
          onConfirm={() => {
            if (parkIfExpired()) return;
            if (itemId) saveDraft(itemId, { title, story, date, photos });
            router.back();
          }}
        />
      ) : null}
      {saved ? (
        <Modal
          title="기록을 메모리에 저장했어요!"
          cancel="리스트로 가기"
          confirm="메모리로 가기"
          onCancel={() => {
            track("record_complete_modal_action", { next_action: "to_list" });
            router.replace("/list");
          }}
          onConfirm={() => {
            track("record_complete_modal_action", { next_action: "to_memory" });
            router.replace("/memory");
          }}
        />
      ) : null}
      {fail ? (
        <Modal
          title="기록에 실패했어요!"
          cancel="리스트로 가기"
          confirm="다시하기"
          onCancel={() => router.replace("/list")}
          onConfirm={() => {
            track("record_retry_click", { retry_count: 1 });
            setFail(false);
          }}
        />
      ) : null}
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

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="shell" />}>
      <RecordInner />
    </Suspense>
  );
}
