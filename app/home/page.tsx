"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PhoneShell, TabBar } from "@/components/ui";
import { HomeSkeleton, QueryError } from "@/components/system";
import { analytics } from "@/lib/events";
import type { Journey, Species } from "@/lib/types";

const SLOT_CLASS = ["node-1", "node-2", "node-3", "node-4", "node-5"];

function roadSrc(journey: Journey, species: Species, filled: number, tall: boolean) {
  const n = Math.min(Math.max(filled, 0), 5);
  const web = tall ? "web_" : "";
  if (journey === "before") return `/bg/${web}before_${species}_road_${n}.png`;
  if (n === 5) return `/bg/${web}after_road_5_${species}.png`;
  return `/bg/${web}after_road_${n}.png`;
}

export default function HomePage() {
  const router = useRouter();
  const { hydrated, loggedIn, pet, homeSlots, cloudStatus, querying, showSkeleton } = useStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) router.replace("/");
    else if (!pet) router.replace("/onboarding");
  }, [hydrated, loggedIn, pet, router]);

  useEffect(() => {
    if (pet) analytics.home_view(pet.journey);
  }, [pet]);

  if (!hydrated || !pet) return <div className="shell" />;

  const land = pet.journey === "before" ? "/bg/bg_before_ver2.png" : "/bg/bg_after_ver2.png";
  const filled = homeSlots.filter(Boolean).length;
  const compactRoad = roadSrc(pet.journey, pet.species, filled, false);
  const tallRoad = roadSrc(pet.journey, pet.species, filled, true);
  const logo =
    pet.journey === "before" ? "/icons/logo_text_guide_before.png" : "/icons/logo_text_guide_after.png";

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
        <img className="home-logo" src={logo} alt="Pet Memory" />
        <div className="home-road-wrap">
          <img className="home-road home-road-compact" src={compactRoad} alt="" />
          <img className="home-road home-road-tall" src={tallRoad} alt="" />
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
                      analytics.home_node_click(i + 1, mem.id);
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
