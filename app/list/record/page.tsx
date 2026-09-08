"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecordEditor } from "@/components/record-editor";

function RecordInner() {
  const sp = useSearchParams();
  return <RecordEditor itemId={sp.get("itemId") ?? undefined} />;
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="shell" />}>
      <RecordInner />
    </Suspense>
  );
}
