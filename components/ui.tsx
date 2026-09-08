"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatDateDots, track } from "@/lib/format";

export function PhoneShell({
  children,
  bg,
  cream,
}: {
  children: ReactNode;
  bg?: string;
  cream?: boolean;
}) {
  return (
    <div className="shell" style={cream ? { background: "var(--cream)" } : undefined}>
      {bg ? <div className="shell-bg" style={{ backgroundImage: `url(${bg})` }} /> : null}
      <div className="shell-body">{children}</div>
    </div>
  );
}

export function TabBar() {
  const path = usePathname();
  const tabs = [
    { href: "/home", src: "/icons/nav_home_default_icon.png", key: "home" },
    { href: "/list", src: "/icons/nav_list_default_icon.png", key: "list" },
    { href: "/memory", src: "/icons/nav_memory_default_icon.png", key: "memory" },
    { href: "/profile", src: "/icons/nav_profile_default_icon.png", key: "profile" },
  ];

  useEffect(() => {
    document.querySelectorAll(".scroll").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  }, [path]);
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const on = path === t.href || path.startsWith(t.href + "/");
        return (
        <Link
            key={t.key}
            href={t.href}
            className={on ? "on" : ""}
            aria-label={t.key}
            onClick={() => track("nav_tab_click", { tab_name: t.key })}
          >
            <img src={t.src} alt="" />
          </Link>
        );
      })}
    </nav>
  );
}

export function Meatball({ onClick, label = "더보기" }: { onClick: () => void; label?: string }) {
  return (
    <button
      className="meat"
      type="button"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <i />
      <i />
      <i />
    </button>
  );
}

export function Modal({
  title,
  body,
  cancel = "돌아가기",
  confirm,
  onCancel,
  onConfirm,
  onDim,
  busy,
  dismissOnDim = true,
}: {
  title: string;
  body?: ReactNode;
  cancel?: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => void;
  onDim?: () => void;
  busy?: boolean;
  dismissOnDim?: boolean;
}) {
  return (
    <div className="dim" onClick={dismissOnDim ? onDim ?? onCancel : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        <div className="modal-btns">
          <button className="btn-ghost" type="button" onClick={onCancel} disabled={busy}>
            {cancel}
          </button>
          <button className="btn-fill" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Calendar({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (s: string) => void;
  onClose: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const parsed = value.match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})$/);
  const init = parsed
    ? new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]))
    : today;
  const [cursor, setCursor] = useState(new Date(init.getFullYear(), init.getMonth(), 1));

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="dim" onClick={onClose}>
      <div className="cal" onClick={(e) => e.stopPropagation()}>
        <div className="cal-head">
          <button type="button" onClick={() => setCursor(new Date(y, m - 1, 1))}>
            ‹
          </button>
          <span>
            {y}년 {m + 1}월
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(y, m + 1, 1))}
            disabled={y === today.getFullYear() && m >= today.getMonth()}
          >
            ›
          </button>
        </div>
        <div className="cal-grid">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="dow">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const date = new Date(y, m, d);
            const future = date.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
            const dots = formatDateDots(new Date(y, m, d));
            return (
              <button
                key={i}
                type="button"
                className={dots === value ? "on" : ""}
                disabled={future}
                onClick={() => {
                  onPick(dots);
                  onClose();
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#191919"
        d="M12 3C6.48 3 2 6.58 2 10.9c0 2.76 1.84 5.18 4.61 6.56-.15.56-.86 3.12-.89 3.35 0 .23.12.2.25.14.17-.08 2.7-1.84 3.12-2.13.9.13 1.84.2 2.91.2 5.52 0 10-3.58 10-7.9C22 6.58 17.52 3 12 3z"
      />
    </svg>
  );
}
