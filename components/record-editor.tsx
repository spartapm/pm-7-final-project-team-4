"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, Calendar, Modal } from "@/components/ui";
import { todayDots, track } from "@/lib/format";
import { resizePhoto } from "@/lib/image";

export function RecordEditor({
  itemId,
  memoryId,
}: {
  itemId?: string;
  memoryId?: string;
}) {
  const router = useRouter();
  const isMemory = Boolean(memoryId);

  const {
    hydrated,
    loggedIn,
    pet,
    items,
    memories,
    saveDraft,
    saveMemoryDraft,
    completeNew,
    updateMemory,
    isSessionValid,
    parkForRelogin,
    runAction,
    actionBusy,
  } = useStore();

  const item = items.find((it) => it.id === itemId);
  const memory = memories.find((m) => m.id === memoryId);

  const initial = useMemo(() => {
    if (memory) {
      if (memory.draft) return memory.draft;
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
  const [inlineErr, setInlineErr] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) return;
    if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (isMemory && memory) track("memory_edit_view", { item_id: memory.id });
    else track("record_edit_view", { entry_point: "list" });
  }, [isMemory, memory]);

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

  function leaveClean() {
    if (isMemory && memory) router.replace(`/memory/${memory.id}`);
    else router.replace("/list");
  }

  function mark(field: string) {
    if (interacted[field]) return;
    setInteracted((s) => ({ ...s, [field]: true }));
    if (!isMemory) track("record_field_interact", { field_name: field });
  }

  function parkIfExpired() {
    if (isSessionValid()) return false;
    const draft = { title, story, date, photos };
    if (itemId) parkForRelogin(itemId, draft);
    else if (memory) {
      saveMemoryDraft(memory.id, draft);
      parkForRelogin();
    } else {
      parkForRelogin();
    }
    router.replace("/");
    return true;
  }

  useEffect(() => {
    if (!hydrated || loggedIn) return;
    parkIfExpired();
  }, [hydrated, loggedIn]);

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
          if (isMemory) track("memory_photo_add", { mem_photo_count: next.length });
          else track("record_photo_add", { photo_count: next.length });
          return next;
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setPhotoPerm(true);
          return;
        }
        const msg = err instanceof Error ? err.message : "";
        const kind = !file.type.startsWith("image/")
          ? "format"
          : file.size > 15 * 1024 * 1024 || msg === "image"
            ? "size"
            : "network";
        if (isMemory) {
          track("memory_photo_upload_fail", { mem_fail_reason: `mem_${kind}` });
        } else {
          track("record_photo_upload_fail", { fail_reason: kind });
        }
        setToast("사진을 불러오지 못했어요");
        setTimeout(() => setToast(""), 1600);
      }
    }
  }

  function goBack() {
    if (dirty) setLeave(true);
    else leaveClean();
  }

  async function doTempSave() {
    if (parkIfExpired()) return;
    setBusy(true);
    const payload = { title, story, date, photos };
    const status = await runAction(() => {
      if (isMemory && memory) saveMemoryDraft(memory.id, payload);
      else if (itemId) saveDraft(itemId, payload);
    });
    setBusy(false);
    if (status === "error") {
      if (!isMemory) track("record_temp_save_fail", { fail_reason: "network" });
      return;
    }
    if (!isMemory) track("record_temp_save");
    setToast("임시 저장을 완료했어요!");
    setTimeout(() => setToast(""), 1600);
  }

  async function persistMemory() {
    if (!memory) return "error" as const;
    return runAction(() =>
      updateMemory(memory.id, { title: title.trim(), story: story.trim(), date, photos })
    );
  }

  async function doComplete() {
    if (parkIfExpired()) return;
    if (!title.trim() || !story.trim()) {
      setFail(true);
      if (isMemory) track("memory_complete_fail", { fail_reason: "validation" });
      else track("record_complete_fail", { fail_reason: "validation" });
      return;
    }
    setBusy(true);
    const status = await runAction(() => {
      if (isMemory && memory) {
        updateMemory(memory.id, { title: title.trim(), story: story.trim(), date, photos });
      } else if (itemId) {
        completeNew(itemId, { title: title.trim(), story: story.trim(), date, photos });
      }
    });
    setBusy(false);
    if (status === "error") {
      setFail(true);
      if (isMemory) track("memory_complete_fail", { fail_reason: "server" });
      else track("record_complete_fail", { fail_reason: "server" });
      return;
    }
    if (isMemory && memory) track("memory_complete", { item_id: memory.id });
    setSaved(true);
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

  const trackId = memory?.id ?? itemId ?? "";

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
            placeholder={isMemory ? "제목을 입력해주세요" : "(리스트 제목 - 수정 가능)"}
            onChange={(e) => {
              mark("title");
              setInlineErr("");
              setTitle(e.target.value.slice(0, 50));
            }}
          />
          <label className="lbl">우리의 이야기</label>
          <textarea
            ref={storyRef}
            value={story}
            maxLength={1000}
            placeholder={isMemory ? "소중한 순간들을 기록해보세요." : "소중한 순간들을 기록해보세요. (200자 내)"}
            onChange={(e) => {
              mark("story");
              setInlineErr("");
              setStory(e.target.value.slice(0, 1000));
            }}
          />
          {inlineErr ? <p className="field-err">{inlineErr}</p> : null}
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
          {isMemory ? null : (
            <button className="btn-ghost" type="button" disabled={busy || actionBusy} onClick={doTempSave}>
              {busy ? <span className="spinner" /> : "임시 저장"}
            </button>
          )}
          <button className="btn-fill" type="button" disabled={busy || actionBusy} onClick={doComplete}>
            {busy ? <span className="spinner" /> : "완료"}
          </button>
        </div>
      </div>
      {cal ? <Calendar value={date} onPick={setDate} onClose={() => setCal(false)} /> : null}
      {leave ? (
        <Modal
          title={
            isMemory
              ? "변경된 내용이 있어요.\n저장하고 나갈까요?"
              : "변경된 내용이 있어요.\n임시 저장할까요?"
          }
          cancel="나가기"
          confirm="저장하고 나가기"
          busy={actionBusy}
          onDim={() => setLeave(false)}
          onCancel={() => {
            if (isMemory) track("memory_exit_modal_action", { item_id: trackId });
            else track("record_exit_modal_action", { item_id: trackId });
            leaveClean();
          }}
          onConfirm={async () => {
            if (parkIfExpired()) return;
            if (isMemory && memory) {
              track("memory_complete_modal_action", { item_id: memory.id });
              if (!title.trim() || !story.trim()) {
                setInlineErr("제목과 이야기를 작성해주세요");
                setLeave(false);
                return;
              }
              const status = await persistMemory();
              if (status === "error") {
                setInlineErr("네트워크 연결을 확인해주세요");
                setLeave(false);
                return;
              }
              router.replace(`/memory/${memory.id}`);
              return;
            }
            if (itemId) {
              track("record_complete_modal_action", { item_id: itemId });
              const status = await runAction(() => saveDraft(itemId, { title, story, date, photos }));
              if (status === "error") {
                track("record_temp_save_fail", { fail_reason: "network" });
                return;
              }
              track("record_temp_save");
            }
            leaveClean();
          }}
        />
      ) : null}
      {saved ? (
        <Modal
          title="기록을 메모리에 저장했어요!"
          cancel="리스트로 가기"
          confirm="메모리로 가기"
          dismissOnDim={false}
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
          onDim={() => setFail(false)}
          onCancel={() => router.replace("/list")}
          onConfirm={() => {
            const next = retryCount + 1;
            setRetryCount(next);
            track("record_retry_click", { retry_count: next });
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
