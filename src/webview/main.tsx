import { mountApp } from "@web/app";
import { createBridge } from "@web/bridge/bridge";
import { APP_ROOT_ID } from "@web/constants";

function mountWebviewApp(): void {
  const root = document.getElementById(APP_ROOT_ID);
  if (!root) {
    throw new Error(`Missing #${APP_ROOT_ID} root`);
  }

  const bridge = createBridge();
  const appController = mountApp(root, bridge);

  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    appController.destroy();
    bridge.dispose();
  };

  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);
}

mountWebviewApp();
