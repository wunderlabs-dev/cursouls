import { BRIDGE_AGENT_ANCHOR, BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { TooltipData } from "@web/bridge/types";
import { Cafe } from "@web/components/cafe";
import { FEED_BUFFER_LIMIT } from "@web/constants";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CafeAppContainerProps {
  bridge: VsCodeBridge;
}

export function CafeAppContainer({ bridge }: CafeAppContainerProps): JSX.Element {
  const { frame, tooltip, lifecycleEvents } = useBridgeSubscription(bridge);
  const agentNames = useRef(new Map<string, string>());

  const handleSeatClick = useCallback(
    (agentId: string) => bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.seat),
    [bridge],
  );
  const handleQueueClick = useCallback(
    (agentId: string) => bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.queue),
    [bridge],
  );

  useMemo(() => {
    if (frame) updateAgentNames(agentNames.current, frame, lifecycleEvents);
  }, [frame, lifecycleEvents]);

  return (
    <Cafe
      frame={frame}
      tooltip={tooltip}
      lifecycleEvents={lifecycleEvents}
      agentNames={agentNames.current}
      onSeatClick={handleSeatClick}
      onQueueClick={handleQueueClick}
    />
  );
}

interface BridgeState {
  frame?: SceneFrame;
  tooltip?: TooltipData;
  lifecycleEvents: AgentLifecycleEvent[];
}

function useBridgeSubscription(bridge: VsCodeBridge): BridgeState {
  const [frame, setFrame] = useState<SceneFrame | undefined>(undefined);
  const [tooltip, setTooltip] = useState<TooltipData | undefined>(undefined);
  const [lifecycleEvents, setLifecycleEvents] = useState<AgentLifecycleEvent[]>([]);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      switch (message.type) {
        case BRIDGE_INBOUND_TYPE.sceneFrame:
          setFrame(message.frame);
          return;
        case BRIDGE_INBOUND_TYPE.tooltipData:
          setTooltip(message.tooltip);
          return;
        case BRIDGE_INBOUND_TYPE.lifecycleEvents:
          setLifecycleEvents(message.events.slice(-FEED_BUFFER_LIMIT));
          return;
        case BRIDGE_INBOUND_TYPE.hideTooltip:
          setTooltip(undefined);
          return;
        default:
          assertNever(message);
      }
    });
    bridge.postReady();
    return () => unsubscribe();
  }, [bridge]);

  return { frame, tooltip, lifecycleEvents };
}

function updateAgentNames(
  names: Map<string, string>,
  frame: SceneFrame,
  events: readonly AgentLifecycleEvent[],
): void {
  const activeIds = new Set<string>();
  for (const seat of frame.seats) {
    if (seat.agent) {
      activeIds.add(seat.agent.id);
      names.set(seat.agent.id, seat.agent.name);
    }
  }
  for (const agent of frame.queue) {
    activeIds.add(agent.id);
    names.set(agent.id, agent.name);
  }
  for (const event of events) {
    activeIds.add(event.agentId);
  }
  for (const id of names.keys()) {
    if (!activeIds.has(id)) {
      names.delete(id);
    }
  }
}

function assertNever(_value: never): never {
  throw new Error("Unhandled inbound bridge message.");
}
