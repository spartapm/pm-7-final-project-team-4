"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell } from "@/components/ui";
import { MemoryDetailSkeleton, QueryError } from "@/components/system";
import { track } from "@/lib/format";

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, loggedIn, pet, memories, cloudStatus, querying, showSkeleton } = useStore();
  const mem = memories.find((m) => m.id === id);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (!mem) return;
    const from = new URLSearchParams(window.location.search).get("from") === "home" ? "home" : "memory";
    track("memory_detail_view", { entry_point: from });
  }, [mem]);

  if (!hydrated || !pet) return <div className="shell" />;
  if (cloudStatus === "error" && !querying) {
    return <QueryError cream tabs={false} />;
  }
  if (showSkeleton && !mem) {
    return (
      <PhoneShell cream>
        <div className="topbar">
          <button className="back" type="button" onClick={() => router.back()}>
            ‹
          </button>
          <h1>기록</h1>
          <div />
        </div>
        <div className="hairline" />
        <MemoryDetailSkeleton />
      </PhoneShell>
    );
  }
  if (!mem) {
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

  const photos = mem.photos;

  return (
    <PhoneShell cream>
      <div className="topbar">
        <button className="back" type="button" onClick={() => router.back()}>
          ‹
        </button>
        <h1>기록</h1>
        <button
          className="right"
          type="button"
          onClick={() => {
            track("memory_edit_click", { item_id: mem.id });
            router.push(`/memory/${mem.id}/edit`);
          }}
        >
          수정
        </button>
      </div>
      <div className="hairline" />
      <div className="scroll detail">
        <p className="date">{mem.date}</p>
        <h2 className="title">{mem.title}</h2>
        {photos.length > 0 ? (
          <div
            className="carousel"
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
              setIdx(Math.min(i, photos.length - 1));
            }}
          >
            {photos.map((src, i) => (
              <div key={i} className="slide">
                <img className="full" src={src} alt="" />
                {photos.length > 1 ? (
                  <div className="slide-idx">
                    {i + 1}/{photos.length}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <h3>우리의 이야기</h3>
        <div className="story-box">{mem.story}</div>
      </div>
    </PhoneShell>
  );
}
