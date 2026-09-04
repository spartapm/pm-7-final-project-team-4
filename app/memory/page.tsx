"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar, Meatball, Modal } from "@/components/ui";
import { MemoryGridSkeleton, QueryError } from "@/components/system";
import { dateKey, track } from "@/lib/format";

export default function MemoryPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, visibleMemories, deleteMemory, cloudStatus, querying, showSkeleton } =
    useStore();
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [openSort, setOpenSort] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) track("memory_view", { card_count: visibleMemories.length, journey_type: pet.journey });
  }, [pet, visibleMemories.length]);

  const cards = useMemo(() => {
    const arr = [...visibleMemories];
    arr.sort((a, b) => dateKey(a.date) - dateKey(b.date));
    if (sort === "latest") arr.reverse();
    return arr;
  }, [visibleMemories, sort]);

  if (!hydrated || !pet) return <div className="shell" />;

  const bg = pet.journey === "before" ? "/bg/bg_before.png" : "/bg/bg_after.png";

  if (cloudStatus === "error" && !querying) {
    return <QueryError bg={bg} />;
  }

  return (
    <PhoneShell bg={bg}>
      <div className="mem-head">
        <h1>메모리</h1>
        <button className="sort" type="button" onClick={() => setOpenSort((v) => !v)}>
          {sort === "latest" ? "최신순" : "오래된순"} {openSort ? "▴" : "▾"}
        </button>
        {openSort ? (
          <div className="sort-menu">
            <button
              type="button"
              onClick={() => {
                setSort("latest");
                setOpenSort(false);
                track("memory_sort_change", { sort_type: "latest" });
              }}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => {
                setSort("oldest");
                setOpenSort(false);
                track("memory_sort_change", { sort_type: "oldest" });
              }}
            >
              오래된순
            </button>
          </div>
        ) : null}
      </div>
      {showSkeleton ? (
        <MemoryGridSkeleton />
      ) : cards.length === 0 ? (
        <div className="list-empty">
          아직 완료한 리스트가 없어요.
          <br />
          리스트를 작성해보세요!
        </div>
      ) : (
        <div className="scroll grid">
          {cards.map((m) => (
            <div key={m.id} className="card">
              <button
                type="button"
                className="card-thumb"
                onClick={() => {
                  track("memory_card_click", { item_id: m.id });
                  router.push(`/memory/${m.id}`);
                }}
              >
                {m.photos[0] ? (
                  <img className="photo" src={m.photos[0]} alt="" />
                ) : (
                  <img className="paw" src="/icons/footprit_icon.png" alt="" />
                )}
              </button>
              <div className="card-meat">
                <Meatball onClick={() => setMenuId((id) => (id === m.id ? null : m.id))} />
              </div>
              {menuId === m.id ? (
                <button className="card-del" type="button" onClick={() => setDelId(m.id)}>
                  삭제
                </button>
              ) : null}
              <button
                type="button"
                className="card-body"
                onClick={() => router.push(`/memory/${m.id}`)}
              >
                <p className="t">{m.title}</p>
                <p className="d">{m.date}</p>
              </button>
            </div>
          ))}
        </div>
      )}
      <TabBar />
      {delId ? (
        <Modal
          title="메모리를 삭제할까요?"
          confirm="삭제하기"
          onCancel={() => {
            setDelId(null);
            setMenuId(null);
          }}
          onConfirm={() => {
            deleteMemory(delId);
            setDelId(null);
            setMenuId(null);
          }}
        />
      ) : null}
    </PhoneShell>
  );
}
