"use client";

import { useParams } from "next/navigation";
import { RecordEditor } from "@/components/record-editor";

export default function MemoryEditPage() {
  const { id } = useParams<{ id: string }>();
  return <RecordEditor memoryId={id} />;
}
