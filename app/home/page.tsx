"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar } from "@/components/ui";
import { HomeSkeleton, QueryError } from "@/components/system";
import { track } from "@/lib/format";

const SLOT_CLASS = ["node-1", "node-2", "node-3", "node-4", "node-5"];

export default function HomePage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, homeSlots, cloudStatus, querying, showSkeleton } = useStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) track("home_view", { journey_type: pet.journey });
  }, [pet]);

  if (!hydrated || !pet) return <div className="shell" />;

  const land = pet.journey === "before" ? "/bg/home_bg_before_wide.png" : "/bg/home_bg_after_wide.png";
  const road = pet.journey === "before" ? "/bg/home_bg_before_road.png" : "/bg/home_bg_after_road.png";

  if (cloudStatus === "error" && !querying) {
    return <QueryError bg={land} />;
  }

  return (
    <PhoneShell className={`home-shell ${pet.journey}`}>
      <div
        className="home-land"
        style={{
          ["--land" as string]: `url(${land})`,
        }}
      />
      <div className="home">
        <img className="home-logo" src="/icons/logo_text.png" alt="Pet Memory" />
        <div className="home-road-wrap">
          <img className="home-road" src={road} alt="" />
          {showSkeleton
            ? <HomeSkeleton />
            : homeSlots.map((mem, i) => {
                if (!mem) return null;
                const hasPhoto = mem.photos.length > 0;
                return (
                  <button
                    key={mem.id}
                    type="button"
                    className={`node ${SLOT_CLASS[i]}`}
                    onClick={() => {
                      track("home_node_click", { node_index: i + 1, item_id: mem.id });
                      router.push(`/memory/${mem.id}?from=home`);
                    }}
                  >
                    <img
                      className={hasPhoto ? "photo" : "paw"}
                      src={hasPhoto ? mem.photos[0] : "/icons/footprit_icon.png"}
                      alt=""
                    />
                  </button>
                );
              })}
        </div>
      </div>
      <TabBar />
    </PhoneShell>
  );
}
