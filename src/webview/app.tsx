import { createRoot } from "react-dom/client";
import type { VsCodeBridge } from "@web/bridge/bridge";
import { CafeAppContainer } from "@web/containers/cafe-app-container";

export interface AppController {
  destroy(): void;
}

export function mountApp(container: HTMLElement, bridge: VsCodeBridge): AppController {
  const root = createRoot(container);
  root.render(<CafeAppContainer bridge={bridge} />);
  return {
    destroy(): void {
      root.unmount();
    },
  };
}
