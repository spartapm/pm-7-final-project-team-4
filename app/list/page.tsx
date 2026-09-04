"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar, Meatball, Modal } from "@/components/ui";
import { track } from "@/lib/format";

export default function ListPage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, visibleItems, addItem, renameItem, deleteItem } = useStore();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [adding, setAdding] = useState(false);
  const [addVal, setAddVal] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) track("list_view", { item_count: visibleItems.length, journey_type: pet.journey });
  }, [pet, visibleItems.length]);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  if (!hydrated || !pet) return <div className="shell" />;

  const title = pet.journey === "before" ? "버킷 리스트" : "추억 리스트";
  const bg = pet.journey === "before" ? "/bg/bg_before.png" : "/bg/bg_after.png";

  function commitAdd() {
    const t = addVal.trim();
    if (!t) {
      setAdding(false);
      setAddVal("");
      return;
    }
    addItem(t);
    setAdding(false);
    setAddVal("");
  }

  function commitRename() {
    if (editingId) {
      const t = editVal.trim();
      if (t) renameItem(editingId, t);
    }
    setEditingId(null);
  }

  return (
    <PhoneShell bg={bg}>
      <div className="list-wrap">
        <h1 className="page-title">{title}</h1>
        {visibleItems.length === 0 && !adding ? (
          <div className="list-empty">
            아직 작성된 리스트가 없어요.
            <br />
            리스트를 작성해보세요!
          </div>
        ) : (
          <div className="scroll list-rows">
            {adding ? (
              <div className="list-row add-row">
                <input
                  ref={addRef}
                    placeholder={pet.journey === "before" ? "버킷리스트를 작성해주세요." : "추억리스트를 작성해주세요."}
                  value={addVal}
                  maxLength={50}
                  onChange={(e) => setAddVal(e.target.value.slice(0, 50))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitAdd();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setAddVal("");
                    }
                  }}
                  onBlur={commitAdd}
                />
                <button className="check" type="button" onMouseDown={(e) => e.preventDefault()} onClick={commitAdd}>
                  <img src="/icons/check_icon.png" alt="확인" />
                </button>
              </div>
            ) : null}
            {visibleItems.map((it) => (
              <div key={it.id} className="list-row">
                {editingId === it.id ? (
                  <input
                    className="rename"
                    value={editVal}
                    maxLength={50}
                    autoFocus
                    onChange={(e) => setEditVal(e.target.value.slice(0, 50))}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                    }}
                  />
                ) : (
                  <button
                    className="main"
                    type="button"
                    onClick={() => {
                      track("list_item_row_click", { item_id: it.id });
                      router.push(`/list/record?itemId=${it.id}&entry=list`);
                    }}
                  >
                    {it.title}
                  </button>
                )}
                <Meatball
                  onClick={() => setMenuId((id) => (id === it.id ? null : it.id))}
                />
                {menuId === it.id ? (
                  <div className="meat-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null);
                        setEditingId(it.id);
                        setEditVal(it.title);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null);
                        setDelId(it.id);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        className="fab"
        type="button"
        aria-label="추가"
        onClick={() => {
          track("list_add_button_click", { journey_type: pet.journey });
          setAdding(true);
          setMenuId(null);
        }}
      >
        <img src="/icons/list_add_icon.png" alt="" />
      </button>
      <TabBar />
      {delId ? (
        <Modal
          title="리스트를 삭제할까요?"
          confirm="삭제하기"
          onCancel={() => setDelId(null)}
          onConfirm={() => {
            deleteItem(delId);
            setDelId(null);
          }}
        />
      ) : null}
    </PhoneShell>
  );
}
