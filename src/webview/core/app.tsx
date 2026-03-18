import type { VsCodeBridge } from "@web/bridge/bridge";
import { Scene } from "@web/components/scene";
import { AgentsProvider } from "@web/context/agents";

export const App = ({ bridge }: { bridge: VsCodeBridge }) => {
  return (
    <AgentsProvider bridge={bridge}>
      <Scene />
    </AgentsProvider>
  );
};
