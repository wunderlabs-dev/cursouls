import * as vscode from "vscode";
import { readCafeConfig } from "./config";
import { createLogger } from "./logging";
import { CAFE_VIEW_TYPE, createCafeViewProvider } from "@ext/providers/provider";
import { createCafeStore } from "@ext/services/store";
import { createWatchController, type WatchController } from "@ext/services/watch";

let activeWatchController: WatchController | undefined;
let activeWatchStartPromise: Promise<void> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Cursor Cafe");
  const logger = createLogger("extension", outputChannel);
  const config = readCafeConfig(vscode.workspace.getConfiguration());
  const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(
    (folder) => folder.uri.fsPath,
  );
  const projectPath = workspacePaths[0] ?? "";
  const store = createCafeStore(config.seatCount);
  const viewProvider = createCafeViewProvider(context.extensionUri);
  const watchController = createWatchController({
    projectPath,
    store,
    debounceMs: config.refreshMs,
    logger,
  });
  activeWatchController = watchController;
  const disposeFrameListener = watchController.onFrame((frame) => {
    viewProvider.updateFrame(frame);
  });
  const disposeLifecycleListener = watchController.onLifecycleEvents((events) => {
    viewProvider.updateLifecycleEvents(events);
  });
  const disposeErrorListener = watchController.onError((error) => {
    logger.error(`Watch refresh error: ${formatUnknownError(error)}`);
  });

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(CAFE_VIEW_TYPE, viewProvider),
    new vscode.Disposable(disposeFrameListener),
    new vscode.Disposable(disposeLifecycleListener),
    new vscode.Disposable(disposeErrorListener),
    vscode.commands.registerCommand("cursorCafe.refresh", async () => {
      try {
        await watchController.refreshNow();
      } catch (error) {
        const message = `Cursor Cafe refresh failed: ${formatUnknownError(error)}`;
        logger.error(message);
        void vscode.window.showErrorMessage(message);
      }
    }),
    new vscode.Disposable(() => {
      void stopWatchController(watchController, logger);
    }),
  );

  viewProvider.updateFrame(store.getFrame());
  viewProvider.updateLifecycleEvents([]);
  activeWatchStartPromise = watchController.start()
    .catch((error: unknown) => {
      logger.error(`Failed to start transcript watch: ${formatUnknownError(error)}`);
    })
    .finally(() => {
      if (activeWatchController === watchController) {
        activeWatchStartPromise = undefined;
      }
    });
}

export function deactivate(): Thenable<void> | void {
  if (!activeWatchController) {
    return;
  }
  const controller = activeWatchController;
  return stopWatchController(controller);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function stopWatchController(controller: WatchController, logger?: { error(message: string): void }): Promise<void> {
  if (activeWatchController === controller) {
    activeWatchController = undefined;
  }

  if (activeWatchStartPromise) {
    try {
      await activeWatchStartPromise;
    } catch {
      // Start failures are already handled during activation.
    } finally {
      activeWatchStartPromise = undefined;
    }
  }

  try {
    await controller.stop();
  } catch (error) {
    logger?.error(`Failed to stop transcript watch: ${formatUnknownError(error)}`);
  }
}
