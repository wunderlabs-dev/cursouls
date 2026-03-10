import { cva } from "class-variance-authority";
import type { AgentSnapshot } from "@shared/types";
import { NO_QUEUE_LABEL, QUEUE_VISIBLE_LIMIT } from "@web/constants";
import { initialsFor } from "@web/present";
import { cn } from "@web/utils/helpers";

interface QueueStripProps {
  queue: readonly AgentSnapshot[];
  onQueueClick: (agentId: string) => void;
}

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] text-[#f5ecdd]",
  {
    variants: {
      status: {
        running: "border-emerald-500/70 bg-emerald-500/10",
        idle: "border-[#584638] bg-[#201a15]",
        completed: "border-teal-500/70 bg-teal-500/10",
        error: "border-red-500/70 bg-red-500/10",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  },
);

export function QueueStrip({ queue, onQueueClick }: QueueStripProps) {
  const visible = queue.slice(0, QUEUE_VISIBLE_LIMIT);
  const overflow = Math.max(0, queue.length - visible.length);
  return (
    <section className="min-h-12 rounded-lg border border-[#3d3229] bg-[#2a221d] p-2" aria-label="Overflow queue">
      {visible.length === 0 ? (
        <div className="text-[11px] text-[#b8aa96]">{NO_QUEUE_LABEL}</div>
      ) : (
        <div className="flex min-h-[30px] items-center gap-1.5">
          {visible.map((agent, index) => (
            <button
              key={agent.id}
              className={cn(chipVariants({ status: agent.status }))}
              type="button"
              title={agent.name}
              aria-label={`Agent ${agent.name}, position ${index + 1}, status ${agent.status}`}
              onClick={() => onQueueClick(agent.id)}
            >
              <span className="text-[10px] text-[#b8aa96]">{index + 1}</span>
              <span className="min-w-5 rounded bg-[#73573f] px-1 text-center text-[#161210]">
                {initialsFor(agent.name)}
              </span>
            </button>
          ))}
          {overflow > 0 ? <div className="ml-1 text-[11px] text-[#b8aa96]">+{overflow}</div> : null}
        </div>
      )}
    </section>
  );
}
