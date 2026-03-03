import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict, intervalToDuration } from "date-fns";
import { createRoot } from "react-dom/client";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import { BRIDGE_AGENT_ANCHOR } from "@shared/bridge";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { TooltipData } from "@web/bridge/types";
import { PhaserCanvas } from "@web/ui/canvas";
import { initialsFor, spriteStatusClass } from "@web/present";
import {
  EMPTY_ELAPSED_LABEL,
  INITIALIZING_LABEL,
  NO_ACTIVE_TASK_LABEL,
  NO_QUEUE_LABEL,
  QUEUE_VISIBLE_LIMIT,
  TOOLTIP_ELAPSED_LABEL,
  TOOLTIP_STATUS_LABEL,
  TOOLTIP_TASK_LABEL,
  TOOLTIP_UPDATED_LABEL,
  UNKNOWN_SOURCE_LABEL,
  WARNING_LABEL_PLURAL,
  WARNING_LABEL_SINGULAR,
} from "@web/constants";

export interface AppController {
  destroy(): void;
}

export function mountApp(container: HTMLElement, bridge: VsCodeBridge): AppController {
  const root = createRoot(container);
  root.render(<CafeApp bridge={bridge} />);
  return {
    destroy(): void {
      root.unmount();
    },
  };
}

function CafeApp({ bridge }: { bridge: VsCodeBridge }) {
  const [frame, setFrame] = useState<SceneFrame | undefined>(undefined);
  const [tooltip, setTooltip] = useState<TooltipData | undefined>(undefined);
  const [lifecycleEvents, setLifecycleEvents] = useState<AgentLifecycleEvent[]>([]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === "sceneFrame") {
        setFrame(message.frame);
        return;
      }
      if (message.type === "tooltipData") {
        setTooltip(message.tooltip);
        return;
      }
      if (message.type === "lifecycleEvents") {
        setLifecycleEvents(message.events);
        return;
      }
      setTooltip(undefined);
    });
    bridge.postReady();
    return () => {
      unsubscribe();
    };
  }, [bridge]);

  const queueAgents = frame?.queue ?? [];
  const lifecycleEventCount = lifecycleEvents.length;
  const queueVisible = queueAgents.slice(0, QUEUE_VISIBLE_LIMIT);
  const queueOverflow = Math.max(0, queueAgents.length - queueVisible.length);
  const healthLabel = useMemo(
    () => (frame ? buildHealthLabel(frame) : INITIALIZING_LABEL),
    [frame],
  );

  const handleSeatClick = useCallback(
    (agentId: string): void => {
      const fallback = findAgentTooltip(frame, agentId);
      if (fallback) {
        setTooltip(fallback);
      }
      bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.seat);
    },
    [bridge, frame],
  );

  const handleQueueClick = useCallback(
    (agentId: string): void => {
      const fallback = findAgentTooltip(frame, agentId);
      if (fallback) {
        setTooltip(fallback);
      }
      bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.queue);
    },
    [bridge, frame],
  );

  return (
    <main
      className="cafe-root"
      aria-label="Cursor Cafe sidebar"
      data-lifecycle-event-count={lifecycleEventCount}
    >
      <header
        className={`cafe-health${frame && !frame.health.sourceConnected ? " is-warning" : ""}`}
      >
        {healthLabel}
      </header>
      <section className="cafe-scene" aria-label="Cafe seats">
        <PhaserCanvas frame={frame} onSeatClick={handleSeatClick} />
      </section>
      <section className="cafe-queue" aria-label="Overflow queue">
        {queueVisible.length === 0 ? (
          <div className="queue-empty">{NO_QUEUE_LABEL}</div>
        ) : (
          <div className="queue-row">
            {queueVisible.map((agent, index) => {
              const statusClass = spriteStatusClass(agent.status);
              return (
                <button
                  key={agent.id}
                  className={`queue-chip ${statusClass}`}
                  data-anchor="queue"
                  data-agent-id={agent.id}
                  type="button"
                  title={agent.name}
                  onClick={() => handleQueueClick(agent.id)}
                >
                  <span className="queue-chip-index">{index + 1}</span>
                  <span className="queue-chip-avatar">{initialsFor(agent.name)}</span>
                </button>
              );
            })}
            {queueOverflow > 0 ? <div className="queue-overflow">+{queueOverflow}</div> : null}
          </div>
        )}
      </section>
      <aside className={`cafe-tooltip${tooltip ? "" : " is-hidden"}`} aria-live="polite">
        {tooltip ? (
          <div className="tooltip-card">
            <div className="tooltip-title">{tooltip.name}</div>
            <div className="tooltip-line">
              <span>{TOOLTIP_STATUS_LABEL}</span>
              <strong>{tooltip.status}</strong>
            </div>
            <div className="tooltip-line">
              <span>{TOOLTIP_TASK_LABEL}</span>
              <strong>{tooltip.task}</strong>
            </div>
            <div className="tooltip-line">
              <span>{TOOLTIP_ELAPSED_LABEL}</span>
              <strong>{tooltip.elapsed}</strong>
            </div>
            <div className="tooltip-line">
              <span>{TOOLTIP_UPDATED_LABEL}</span>
              <strong>{tooltip.updated}</strong>
            </div>
          </div>
        ) : null}
      </aside>
    </main>
  );
}

function findAgentTooltip(frame: SceneFrame | undefined, agentId: string): TooltipData | undefined {
  if (!frame) {
    return undefined;
  }
  const seated = frame.seats
    .map((seat) => seat.agent)
    .find((agent) => Boolean(agent && agent.id === agentId));
  const queued = frame.queue.find((agent) => agent.id === agentId);
  const agent = seated ?? queued;
  if (!agent) {
    return undefined;
  }

  const elapsed = agent.startedAt
    ? (() => {
        const { hours = 0, minutes = 0 } = intervalToDuration({
          start: agent.startedAt,
          end: Date.now(),
        });
        return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(0, minutes)}m`;
      })()
    : EMPTY_ELAPSED_LABEL;

  const updated = formatDistanceToNowStrict(agent.updatedAt, { addSuffix: true });

  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    task: agent.taskSummary || NO_ACTIVE_TASK_LABEL,
    elapsed,
    updated,
  };
}

function buildHealthLabel(frame: SceneFrame): string {
  const source = frame.health.sourceLabel || UNKNOWN_SOURCE_LABEL;
  const warnings = frame.health.warnings.length;
  if (warnings === 0) {
    return source;
  }
  const label = warnings === 1 ? WARNING_LABEL_SINGULAR : WARNING_LABEL_PLURAL;
  return `${source} (${warnings} ${label})`;
}
