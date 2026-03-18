import { formatUnknown } from "@ext/errors";
import { type InboundMessage, safeParseOutbound } from "@shared/bridge";
import type { AgentSnapshot } from "@shared/types";
import type * as vscode from "vscode";
import { getWebviewHtml } from "./html";

export const CAFE_VIEW_TYPE = "cursorCafe.sidebar";

export interface CafeViewProvider extends vscode.WebviewViewProvider {
  updateAgents(agents: AgentSnapshot[]): void;
}

interface ProviderState {
  view?: vscode.WebviewView;
  latestAgents?: AgentSnapshot[];
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
    updateAgents(agents: AgentSnapshot[]): void {
      state.latestAgents = agents;
      post({ agents });
    },
  };
}

function handleOutboundMessage(
  message: unknown,
  state: ProviderState,
  post: (msg: InboundMessage) => void,
  logger?: { warn(msg: string): void },
): void {
  const parsed = safeParseOutbound(message);
  if (!parsed.success) {
    logInvalidMessage(parsed, message, logger);
    return;
  }
  if (state.latestAgents) {
    post({ agents: state.latestAgents });
  }
}

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
