import { useCallback, useEffect, useState } from "react";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import { BRIDGE_AGENT_ANCHOR, BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { VsCodeBridge } from "@web/bridge/bridge";
import type { TooltipData } from "@web/bridge/types";
import { Cafe } from "@web/components/cafe";

export function CafeAppContainer({ bridge }: { bridge: VsCodeBridge }) {
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
          setLifecycleEvents(message.events);
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

  const handleSeatClick = useCallback(
    (agentId: string) => bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.seat),
    [bridge],
  );
  const handleQueueClick = useCallback(
    (agentId: string) => bridge.postAgentClick(agentId, BRIDGE_AGENT_ANCHOR.queue),
    [bridge],
  );

  return (
    <Cafe
      frame={frame}
      tooltip={tooltip}
      lifecycleEvents={lifecycleEvents}
      onSeatClick={handleSeatClick}
      onQueueClick={handleQueueClick}
    />
  );
}

function assertNever(_value: never): never {
  throw new Error("Unhandled inbound bridge message.");
}
