import { AgentsProvider } from "@web/context/agents";
import { Scene } from "@web/components/scene";

import type { VsCodeBridge } from "@web/bridge/bridge";

export const App = ({ bridge }: { bridge: VsCodeBridge }) => {
  return (
    <AgentsProvider bridge={bridge}>
      <Scene />
    </AgentsProvider>
  );
};
