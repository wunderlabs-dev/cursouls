import { useMemo, useRef, useEffect } from "react";
import { AGENT_LIFECYCLE_EVENT_KIND, type AgentLifecycleEvent, type AgentLifecycleEventType } from "@shared/types";
import {
  ACTIVITY_FEED_EMPTY_LABEL,
  ACTIVITY_FEED_LABEL,
  ACTIVITY_FEED_VISIBLE_LIMIT,
} from "@web/constants";
import {
  formatLifecycleEvent,
  isVisibleLifecycleEvent,
  lifecycleGlyph,
} from "@web/present";
import { cn } from "@web/utils/helpers";

interface ActivityFeedProps {
  events: readonly AgentLifecycleEvent[];
  agentNames: ReadonlyMap<string, string>;
}

const KIND_COLOR: Partial<Record<AgentLifecycleEventType, string>> = {
  [AGENT_LIFECYCLE_EVENT_KIND.joined]: "text-emerald-400",
  [AGENT_LIFECYCLE_EVENT_KIND.left]: "text-stone-500",
  [AGENT_LIFECYCLE_EVENT_KIND.statusChanged]: "text-amber-400",
};

export function ActivityFeed({ events, agentNames }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const visibleEvents = useMemo(
    () => events.filter(isVisibleLifecycleEvent).slice(-ACTIVITY_FEED_VISIBLE_LIMIT),
    [events],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [visibleEvents]);

  return (
    <section
      className="rounded-lg border border-[#3d3229] bg-[#2a221d] p-2"
      aria-label={ACTIVITY_FEED_LABEL}
    >
      <div className="mb-1 text-[10px] font-medium text-[#b8aa96]">
        {ACTIVITY_FEED_LABEL}
      </div>
      {visibleEvents.length === 0 ? (
        <div className="text-[10px] text-[#6b5f52]">{ACTIVITY_FEED_EMPTY_LABEL}</div>
      ) : (
        <div
          ref={scrollRef}
          className="flex max-h-24 flex-col gap-0.5 overflow-y-auto"
        >
          {visibleEvents.map((event, index) => (
            <FeedEntry
              key={`${event.agentId}-${event.at}-${index}`}
              event={event}
              agentNames={agentNames}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FeedEntry({
  event,
  agentNames,
}: {
  event: AgentLifecycleEvent;
  agentNames: ReadonlyMap<string, string>;
}) {
  const label = formatLifecycleEvent(event, agentNames);
  const glyph = lifecycleGlyph(event.kind);
  const color = KIND_COLOR[event.kind] ?? "text-[#6b5f52]";
  const time = formatFeedTime(event.at);

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className={cn("w-3 shrink-0 text-center", color)}>{glyph}</span>
      <span className="min-w-0 flex-1 truncate text-[#d4c9b8]">{label}</span>
      <span className="shrink-0 tabular-nums text-[#6b5f52]">{time}</span>
    </div>
  );
}

function formatFeedTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
