"use client";

import { PhoneShell, TabBar } from "./ui";
import { useStore } from "@/lib/store";

export function QueryError({
  cream,
  bg,
  tabs = true,
}: {
  cream?: boolean;
  bg?: string;
  tabs?: boolean;
}) {
  const { retryPull } = useStore();
  return (
    <PhoneShell cream={cream} bg={bg}>
      <div className="net-center">
        <p>네트워크 연결을 확인해주세요</p>
        <button type="button" className="btn-fill net-retry" onClick={retryPull}>
          다시 시도
        </button>
      </div>
      {tabs ? <TabBar /> : null}
    </PhoneShell>
  );
}

export function ActionErrorBar() {
  const { actionError, retryPush, clearActionError } = useStore();
  if (!actionError) return null;
  return (
    <div className="net-bottom">
      <span>네트워크 연결을 확인해주세요</span>
      <button type="button" onClick={retryPush}>
        다시 시도
      </button>
      <button type="button" className="ghost" onClick={clearActionError}>
        닫기
      </button>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <>
      <div className="skel skel-node node-1" />
      <div className="skel skel-node node-2" />
      <div className="skel skel-node node-3" />
      <div className="skel skel-node node-4" />
      <div className="skel skel-node node-5" />
    </>
  );
}

export function MemoryGridSkeleton() {
  return (
    <div className="scroll grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skel skel-card" />
      ))}
    </div>
  );
}

export function MemoryDetailSkeleton() {
  return (
    <div className="scroll detail">
      <div className="skel skel-line" style={{ width: 120, height: 16 }} />
      <div className="skel skel-line" style={{ width: 220, height: 28, marginTop: 10 }} />
      <div className="skel skel-slide" />
      <div className="skel skel-story" />
    </div>
  );
}
