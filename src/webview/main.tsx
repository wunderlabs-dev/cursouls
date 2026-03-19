import { isNil } from "lodash";
import { createRoot } from "react-dom/client";

import { createBridge } from "@web/bridge/bridge";

import { App } from "@web/core/app";

const APP_ROOT_ID = "app";

const mount = () => {
  const element = document.getElementById(APP_ROOT_ID);

  if (isNil(element)) {
    throw new Error(`Missing #${APP_ROOT_ID} root`);
  }

  const bridge = createBridge();
  const root = createRoot(element);

  root.render(<App bridge={bridge} />);
};

mount();
