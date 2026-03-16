import { createRoot } from "react-dom/client";

import { APP_ROOT_ID } from "@web/helpers/constants";
import { createBridge } from "@web/bridge/bridge";

import { CafeAppContainer } from "@web/components/cafe-app-container";

function mount(): void {
  const el = document.getElementById(APP_ROOT_ID);
  if (!el) {
    throw new Error(`Missing #${APP_ROOT_ID} root`);
  }

  const bridge = createBridge();
  const root = createRoot(el);
  root.render(<CafeAppContainer bridge={bridge} />);

  let disposed = false;
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    root.unmount();
    bridge.dispose();
  };

  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);
}

mount();
