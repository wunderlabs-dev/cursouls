import * as vscode from "vscode";
import { readCafeConfig } from "./config";
import { formatUnknownError } from "./errors";
import { createLogger } from "./logging";
import { CAFE_VIEW_TYPE, createCafeViewProvider } from "@ext/providers/provider";
import { createCafeStore } from "@ext/services/store";
import { createWatchController, type WatchController } from "@ext/services/watch";
import { AGENT_SOURCE_KIND } from "@shared/types";

let stopActiveSession: (() => Promise<void>) | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Cursor Cafe");
  const logger = createLogger("extension", outputChannel);
  const config = readCafeConfig(vscode.workspace.getConfiguration());
  const store = createCafeStore(config.seatCount);
  const viewProvider = createCafeViewProvider(context.extensionUri, logger);
  let currentController: WatchController | undefined;
  let isDisposed = false;
  let disposeFrameListener: () => void = () => undefined;
  let disposeLifecycleListener: () => void = () => undefined;
  let disposeErrorListener: () => void = () => undefined;
  let replacePromise: Promise<void> = Promise.resolve();

  function detachControllerListeners(): void {
    disposeFrameListener();
    disposeLifecycleListener();
    disposeErrorListener();
    disposeFrameListener = () => undefined;
    disposeLifecycleListener = () => undefined;
    disposeErrorListener = () => undefined;
  }

  async function replaceWatchController(): Promise<void> {
    if (isDisposed) {
      return;
    }
    const previousController = currentController;
    if (previousController) {
      detachControllerListeners();
      await stopController(previousController, logger);
      currentController = undefined;
    }

    const workspacePaths = (vscode.workspace.workspaceFolders ?? []).map(
      (folder) => folder.uri.fsPath,
    );

    if (workspacePaths.length === 0) {
      logger.warn("Cursor Cafe watch is idle: open a workspace folder to start watching agents.");
      viewProvider.updateFrame(
        store.update(
          {
            agents: [],
            health: {
              sourceConnected: false,
              sourceLabel: AGENT_SOURCE_KIND.cursorTranscripts,
              warnings: ["Open a workspace folder to enable transcript watching."],
            },
          },
          Date.now(),
        ),
      );
      return;
    }

    const nextController = createWatchController({
      workspacePaths,
      store,
      debounceMs: config.refreshMs,
      logger,
    });
    currentController = nextController;
    disposeFrameListener = nextController.onFrame((frame) => {
      viewProvider.updateFrame(frame);
    });
    disposeLifecycleListener = nextController.onLifecycleEvents((events) => {
      viewProvider.updateLifecycleEvents(events);
    });
    disposeErrorListener = nextController.onError((error) => {
      logger.error(`Watch refresh error: ${formatUnknownError(error)}`);
    });
    await nextController
      .start()
      .catch((error: unknown) => {
        logger.error(`Failed to start transcript watch: ${formatUnknownError(error)}`);
      });
  }

  function scheduleWatchControllerReplace(): void {
    replacePromise = replacePromise
      .then(() => replaceWatchController())
      .catch((error: unknown) => {
        logger.error(`Failed to update transcript watch: ${formatUnknownError(error)}`);
      });
  }

  async function shutdownSession(): Promise<void> {
    isDisposed = true;
    detachControllerListeners();
    await replacePromise.catch(() => undefined);
    if (currentController) {
      await stopController(currentController, logger);
      currentController = undefined;
    }
  }

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(CAFE_VIEW_TYPE, viewProvider),
    vscode.commands.registerCommand("cursorCafe.refresh", async () => {
      if (!currentController) {
        const message = "Open a workspace folder to enable Cursor Cafe refresh.";
        logger.warn(message);
        void vscode.window.showWarningMessage(message);
        return;
      }
      try {
        await currentController.refreshNow();
      } catch (error) {
        const message = `Cursor Cafe refresh failed: ${formatUnknownError(error)}`;
        logger.error(message);
        void vscode.window.showErrorMessage(message);
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      scheduleWatchControllerReplace();
    }),
    new vscode.Disposable(() => {
      void shutdownSession();
    }),
  );

  viewProvider.updateFrame(store.getFrame());
  viewProvider.updateLifecycleEvents([]);
  scheduleWatchControllerReplace();
  stopActiveSession = shutdownSession;
}

export function deactivate(): Thenable<void> | void {
  if (!stopActiveSession) {
    return;
  }
  const stop = stopActiveSession;
  stopActiveSession = undefined;
  return stop();
}
async function stopController(controller: WatchController, logger?: { error(message: string): void }): Promise<void> {
  try {
    await controller.stop();
  } catch (error) {
    logger?.error(`Failed to stop transcript watch: ${formatUnknownError(error)}`);
  }
}
