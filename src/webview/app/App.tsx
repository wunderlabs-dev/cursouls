import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { SceneFrame } from "@shared/types";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { TooltipData } from "@web/bridge/types";
import { PhaserCanvas } from "@web/ui/canvas";
import { initialsFor, spriteStatusClass } from "@web/ui/sprites";

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
      setTooltip(undefined);
    });
    bridge.postReady();
    return () => {
      unsubscribe();
    };
  }, [bridge]);

  const queueAgents = frame?.queue ?? [];
  const queueVisible = queueAgents.slice(0, 8);
  const queueOverflow = Math.max(0, queueAgents.length - queueVisible.length);
  const healthLabel = useMemo(() => (frame ? buildHealthLabel(frame) : "initializing..."), [frame]);

  const handleSeatClick = useCallback(
    (agentId: string): void => {
      const fallback = findAgentTooltip(frame, agentId);
      if (fallback) {
        setTooltip(fallback);
      }
      bridge.postAgentClick(agentId, "seat");
    },
    [bridge, frame],
  );

  const handleQueueClick = useCallback(
    (agentId: string): void => {
      const fallback = findAgentTooltip(frame, agentId);
      if (fallback) {
        setTooltip(fallback);
      }
      bridge.postAgentClick(agentId, "queue");
    },
    [bridge, frame],
  );

  return (
    <main className="cafe-root" aria-label="Cursor Cafe sidebar">
      <header className={`cafe-health${frame && !frame.health.sourceConnected ? " is-warning" : ""}`}>
        {healthLabel}
      </header>
      <section className="cafe-scene" aria-label="Cafe seats">
        <PhaserCanvas frame={frame} onSeatClick={handleSeatClick} />
      </section>
      <section className="cafe-queue" aria-label="Overflow queue">
        {queueVisible.length === 0 ? (
          <div className="queue-empty">No queue</div>
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
              <span>Status</span>
              <strong>{tooltip.status}</strong>
            </div>
            <div className="tooltip-line">
              <span>Task</span>
              <strong>{tooltip.task}</strong>
            </div>
            <div className="tooltip-line">
              <span>Elapsed</span>
              <strong>{tooltip.elapsed}</strong>
            </div>
            <div className="tooltip-line">
              <span>Updated</span>
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
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    task: agent.taskSummary || "No active task",
    elapsed: formatElapsed(agent.startedAt),
    updated: formatRelative(agent.updatedAt),
  };
}

function buildHealthLabel(frame: SceneFrame): string {
  const source = frame.health.sourceLabel || "unknown source";
  const warnings = frame.health.warnings.length;
  if (warnings === 0) {
    return source;
  }
  return `${source} (${warnings} warning${warnings === 1 ? "" : "s"})`;
}

function formatElapsed(startedAt?: number): string {
  if (!startedAt) {
    return "-";
  }
  const totalMinutes = Math.floor((Date.now() - startedAt) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(0, minutes)}m`;
}

function formatRelative(updatedAt: number): string {
  const seconds = Math.floor(Math.max(0, Date.now() - updatedAt) / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return `${Math.floor(minutes / 60)}h ago`;
}
