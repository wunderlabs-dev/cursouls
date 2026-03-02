import * as vscode from "vscode";
import { readCafeConfig } from "./config";
import { createLogger } from "./logging";
import { CAFE_VIEW_TYPE, createCafeViewProvider } from "@ext/providers/provider";
import { createAgentSource } from "@ext/sources";
import { resolveTranscriptSourcePaths } from "@ext/sources/discovery";
import { createCafeStore } from "@ext/services/store";
import { createPollingController, type PollingController } from "@ext/services/polling";

let activePollingController: PollingController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Cursor Cafe");
  const logger = createLogger("extension", outputChannel);
  const config = readCafeConfig(vscode.workspace.getConfiguration());
  const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(
    (folder) => folder.uri.fsPath,
  );
  const transcriptPaths = resolveTranscriptSourcePaths({
    workspacePaths,
    configuredPaths: config.transcriptPaths,
  });
  const store = createCafeStore(config.seatCount);
  const source = createAgentSource({
    mode: config.sourceMode,
    transcriptOptions: {
      sourcePaths: transcriptPaths,
    },
    mockOptions: {
      agentCount: config.mockAgentCount,
    },
  });
  const viewProvider = createCafeViewProvider(context.extensionUri);
  const pollingController = createPollingController({
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
    vscode.window.registerWebviewViewProvider(CAFE_VIEW_TYPE, viewProvider),
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
