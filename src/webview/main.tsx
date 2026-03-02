import { mountApp } from "@web/app/app";
import { useVsCodeBridge } from "@web/bridge/bridge";

export function mountWebviewApp(): void {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root");
  }

  const bridge = useVsCodeBridge();
  let appController = mountApp(root, bridge);

  window.addEventListener("beforeunload", () => {
    appController.destroy();
    bridge.dispose();
    appController = {
      destroy(): void {
        // no-op after cleanup
      },
    };
  });
}

mountWebviewApp();
