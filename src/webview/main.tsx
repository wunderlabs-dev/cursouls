import { createRoot } from "react-dom/client";
import { not } from "ramda";

import { APP_ROOT_ID } from "@web/helpers/constants";
import { createBridge } from "@web/bridge/bridge";

import { App } from "@web/core/app";

const mount = () => {
  const element = document.getElementById(APP_ROOT_ID);

  if (not(element)) {
    throw new Error(`Missing #${APP_ROOT_ID} root`);
  }

  const bridge = createBridge();
  const root = createRoot(element);

  root.render(<App bridge={bridge} />);
};

mount();
