"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar } from "@/components/ui";
import { track } from "@/lib/format";

const SLOT_CLASS = ["node-1", "node-2", "node-3", "node-4", "node-5"];

export default function HomePage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, homeSlots } = useStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) track("home_view", { journey_type: pet.journey });
  }, [pet]);

  if (!hydrated || !pet) return <div className="shell" />;

  const bg = pet.journey === "before" ? "/bg/home_bg_before.png" : "/bg/home_bg_after.png";

  return (
    <PhoneShell bg={bg}>
      <div className="home">
        <img className="home-logo" src="/icons/logo_text.png" alt="Pet Memory" />
        {homeSlots.map((mem, i) => {
          if (!mem) return null;
          const src = mem.photos[0] || "/icons/footprit_icon.png";
          return (
            <button
              key={mem.id}
              type="button"
              className={`node ${SLOT_CLASS[i]}`}
              onClick={() => {
                track("home_node_click", { node_index: i + 1, item_id: mem.id });
                router.push(`/memory/${mem.id}`);
              }}
            >
              <img src={src} alt="" />
            </button>
          );
        })}
      </div>
      <TabBar />
    </PhoneShell>
  );
}
