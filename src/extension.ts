import * as vscode from "vscode";
import { createAgentSource } from "./agent-source";
import { readCafeConfig } from "./config";
import { createLogger } from "./logging";
import { CafeStore } from "./state/CafeStore";
import { PollingController } from "./state/PollingController";
import { CafeViewProvider } from "./webview/CafeViewProvider";

let activePollingController: PollingController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Cursor Cafe");
  const logger = createLogger("extension", outputChannel);
  const config = readCafeConfig(vscode.workspace.getConfiguration());
  const store = new CafeStore(config.seatCount);
  const source = createAgentSource({
    mode: config.sourceMode,
    mockOptions: {
      agentCount: config.mockAgentCount,
    },
  });
  const viewProvider = new CafeViewProvider(context.extensionUri);
  const pollingController = new PollingController({
    source,
    store,
    refreshMs: config.refreshMs,
    logger,
  });
  activePollingController = pollingController;
  const disposeFrameListener = pollingController.onFrame((frame) => {
    viewProvider.updateFrame(frame);
  });
  const disposeErrorListener = pollingController.onError((error) => {
    logger.error(`Polling error: ${formatUnknownError(error)}`);
  });

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(CafeViewProvider.viewType, viewProvider),
    new vscode.Disposable(disposeFrameListener),
    new vscode.Disposable(disposeErrorListener),
    vscode.commands.registerCommand("cursorCafe.refresh", async () => {
      try {
        const frame = await pollingController.pollOnce();
        viewProvider.updateFrame(frame);
      } catch (error) {
        const message = `Cursor Cafe refresh failed: ${formatUnknownError(error)}`;
        logger.error(message);
        void vscode.window.showErrorMessage(message);
      }
    }),
    new vscode.Disposable(() => {
      void pollingController.stop();
      if (activePollingController === pollingController) {
        activePollingController = undefined;
      }
    }),
  );

  viewProvider.updateFrame(store.getFrame());
  void pollingController.start().catch((error: unknown) => {
    logger.error(`Failed to start polling: ${formatUnknownError(error)}`);
  });
}

export function deactivate(): Thenable<void> | void {
  if (!activePollingController) {
    return;
  }
  const controller = activePollingController;
  activePollingController = undefined;
  return controller.stop();
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
