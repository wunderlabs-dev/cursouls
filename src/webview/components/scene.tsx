// import { useMemo, useRef, useEffect } from "react";
// import type { AgentLifecycleEvent, AgentSnapshot } from "@shared/types";
// import { ACTIVITY_FEED_VISIBLE_LIMIT } from "@web/helpers/constants";
// import { formatLifecycleEvent, isVisibleLifecycleEvent, lifecycleGlyph } from "@web/helpers/present";

import { useAgents } from "@web/context/agents";


export const Scene = () => {
  const { agents, lifecycleEvents, agentNames } = useAgents();

  return (
    <main className="w-full min-h-screen flex py-4">
      <div className="bg-cream flex-1 rounded-sm">
      </div>
    </main>
  );
}
