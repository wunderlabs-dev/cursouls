import { useCallback, useState } from "react";

import type { AgentStatus } from "@shared/types";

import { AGENT_STATUS } from "@shared/types";

const PHASE = {
  spawning: "spawning",
  active: "active",
} as const;

type Phase = (typeof PHASE)[keyof typeof PHASE];

const STATUS_ANIMATION = {
  [AGENT_STATUS.running]: "working",
  [AGENT_STATUS.idle]: "task-complete",
  [AGENT_STATUS.completed]: "task-complete",
  [AGENT_STATUS.error]: "task-failed",
} as const satisfies Record<AgentStatus, string>;

interface AnimationLifecycle {
  readonly animationName: string;
  readonly advance: () => void;
}

export const useAnimationLifecycle = (skin: string, status: AgentStatus): AnimationLifecycle => {
  const [phase, setPhase] = useState<Phase>(PHASE.spawning);

  const advance = useCallback(() => {
    setPhase(PHASE.active);
  }, []);

  const animationName =
    phase === PHASE.spawning ? `${skin}/spawn` : `${skin}/${STATUS_ANIMATION[status]}`;

  return { animationName, advance };
};
