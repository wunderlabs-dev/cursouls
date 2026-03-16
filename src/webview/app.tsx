import type { VsCodeBridge } from "@web/bridge/bridge";
import { CafeAppContainer } from "@web/containers/cafe-app-container";
import { createRoot } from "react-dom/client";

export function mountApp(container: HTMLElement, bridge: VsCodeBridge): { destroy(): void } {
  const root = createRoot(container);
  root.render(<CafeAppContainer bridge={bridge} />);
  return {
    destroy(): void {
      root.unmount();
    },
  };
}
