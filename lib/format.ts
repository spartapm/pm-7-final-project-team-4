export function track(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;
  const payload = { event: name, ...params };
  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(payload);
  if (typeof w.gtag === "function") {
    w.gtag("event", name, params ?? {});
  }
  console.debug("[ga]", name, params ?? {});
}

export function formatDateDots(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${day}`;
}

export function parseDots(s: string): Date | null {
  const m = s.match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateKey(s: string) {
  const d = parseDots(s);
  return d ? d.getTime() : 0;
}

export function todayDots() {
  return formatDateDots(new Date());
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export const SPECIES_KO = { dog: "강아지", cat: "고양이" } as const;
