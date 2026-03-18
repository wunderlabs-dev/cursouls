import type { CanonicalAgentSnapshot } from "@agentprobe/core";
import { formatUnknown } from "@ext/errors";
import {
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  type InboundMessage,
  safeParseOutboundBridgeMessage,
} from "@shared/bridge";
import type * as vscode from "vscode";
import { getWebviewHtml } from "./html";

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateAgents(agents: CanonicalAgentSnapshot[]): void;
}

interface ProviderState {
  view?: vscode.WebviewView;
  latestAgents?: CanonicalAgentSnapshot[];
}

export function createCafeViewProvider(
  extensionUri: vscode.Uri,
  logger?: { warn(message: string): void },
): CafeViewProvider {
  const state: ProviderState = {};
  const post = (message: InboundMessage): void => {
    if (state.view) void state.view.webview.postMessage(message);
  };

  return {
    resolveWebviewView(nextView: vscode.WebviewView): void {
      state.view = nextView;
      nextView.webview.options = { enableScripts: true, localResourceRoots: [extensionUri] };
      nextView.webview.html = getWebviewHtml(nextView.webview, extensionUri);
      nextView.onDidDispose(() => {
        state.view = undefined;
      });
      nextView.webview.onDidReceiveMessage((msg: unknown) =>
        handleOutboundMessage(msg, state, post, logger),
      );
    },
    updateAgents(agents: CanonicalAgentSnapshot[]): void {
      state.latestAgents = agents;
      post({ type: BRIDGE_INBOUND_TYPE.agents, agents });
    },
  };
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Zod SafeParseReturnType is unresolvable by typescript-eslint */
function handleOutboundMessage(
  message: unknown,
  state: ProviderState,
  post: (msg: InboundMessage) => void,
  logger?: { warn(msg: string): void },
): void {
  const parsed = safeParseOutboundBridgeMessage(message);
  if (!parsed.success) {
    logInvalidMessage(parsed, message, logger);
    return;
  }
  if (parsed.data.type === BRIDGE_OUTBOUND_TYPE.ready) {
    if (state.latestAgents) {
      post({ type: BRIDGE_INBOUND_TYPE.agents, agents: state.latestAgents });
    }
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

function logInvalidMessage(
  parsed: { error: { issues: { message: string }[] } },
  raw: unknown,
  logger?: { warn(message: string): void },
): void {
  const reason = parsed.error.issues.map((issue: { message: string }) => issue.message).join("; ");
  const details = `[cursor-cafe] Ignoring malformed webview message: ${reason || formatUnknown(raw)}`;
  if (logger) {
    logger.warn(details);
  } else {
    console.warn(details);
  }
}
