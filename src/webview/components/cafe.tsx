import type { SceneFrame } from "@shared/types";
import type { TooltipData } from "@web/bridge/types";
import { INITIALIZING_LABEL } from "@web/constants";
import { CafeScene } from "@web/components/scene/cafe-scene";
import { HealthBanner } from "@web/components/ui/health-banner";
import { QueueStrip } from "@web/components/ui/queue-strip";
import { TooltipCard } from "@web/components/ui/tooltip-card";

interface CafeProps {
  frame?: SceneFrame;
  tooltip?: TooltipData;
  onSeatClick: (agentId: string) => void;
  onQueueClick: (agentId: string) => void;
}

export function Cafe({
  frame,
  tooltip,
  onSeatClick,
  onQueueClick,
}: CafeProps) {
  return (
    <main
      className="grid h-full min-h-0 grid-rows-[auto_1fr_auto_auto] gap-1.5 p-1.5"
      aria-label="Cursor Cafe sidebar"
    >
      <HealthBanner frame={frame} fallbackLabel={INITIALIZING_LABEL} />
      <section
        className="flex h-full min-h-0 items-stretch justify-stretch overflow-hidden rounded-[10px] border border-[#3d3229] bg-gradient-to-b from-[#221b16] to-[#1c1713]"
        aria-label="Cafe seats"
      >
        <CafeScene frame={frame} onSeatClick={onSeatClick} />
      </section>
      <QueueStrip queue={frame?.queue ?? []} onQueueClick={onQueueClick} />
      <TooltipCard tooltip={tooltip} />
    </main>
  );
}
