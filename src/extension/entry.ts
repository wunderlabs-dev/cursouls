import type { CafeViewProvider } from "@ext/providers/provider";
import { CAFE_VIEW_TYPE, createCafeViewProvider } from "@ext/providers/provider";
import { createWatchController, type WatchController } from "@ext/services/watch";
import * as vscode from "vscode";
import { formatUnknownError } from "./errors";
import type { Logger } from "./logging";
import { createLogger } from "./logging";

let stopActiveSession: (() => Promise<void>) | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Cursor Cafe");
  const logger = createLogger("extension", outputChannel);
  const session = createWatchSession(context.extensionUri, logger);

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(CAFE_VIEW_TYPE, session.viewProvider),
    vscode.commands.registerCommand("cursorCafe.refresh", () =>
      handleRefreshCommand(session, logger),
    ),
    vscode.workspace.onDidChangeWorkspaceFolders(() => session.scheduleReplace()),
    new vscode.Disposable(() => void session.shutdown()),
  );

  session.scheduleReplace();
  stopActiveSession = () => session.shutdown();
}

export function deactivate(): Thenable<void> | void {
  if (!stopActiveSession) return;
  const stop = stopActiveSession;
  stopActiveSession = undefined;
  return stop();
}

interface WatchSession {
  readonly viewProvider: CafeViewProvider;
  scheduleReplace(): void;
  shutdown(): Promise<void>;
  readonly currentController: WatchController | undefined;
}

interface SessionState {
  controller?: WatchController;
  disposed: boolean;
  detach: () => void;
  replacePromise: Promise<void>;
}

function createWatchSession(extensionUri: vscode.Uri, logger: Logger): WatchSession {
  const viewProvider = createCafeViewProvider(extensionUri, logger);
  const state: SessionState = {
    disposed: false,
    detach: () => undefined,
    replacePromise: Promise.resolve(),
  };

  return {
    viewProvider,
    get currentController() {
      return state.controller;
    },
    scheduleReplace(): void {
      state.replacePromise = state.replacePromise
        .then(() => replaceController(state, viewProvider, logger))
        .catch((error: unknown) =>
          logger.error(`Failed to update transcript watch: ${formatUnknownError(error)}`),
        );
    },
    shutdown: () => shutdownSession(state, logger),
  };
}

async function shutdownSession(state: SessionState, logger: Logger): Promise<void> {
  state.disposed = true;
  state.detach();
  await state.replacePromise.catch(() => undefined);
  if (state.controller) {
    await stopControllerSafely(state.controller, logger);
    state.controller = undefined;
  }
}

async function replaceController(
  state: SessionState,
  viewProvider: CafeViewProvider,
  logger: Logger,
): Promise<void> {
  if (state.disposed) return;
  if (state.controller) {
    state.detach();
    await stopControllerSafely(state.controller, logger);
    state.controller = undefined;
  }
  const workspacePaths = getWorkspacePaths();
  if (workspacePaths.length === 0) {
    logger.warn(
      "Cursor Cafe watch is idle: Open a workspace folder to enable transcript watching.",
    );
    return;
  }
  await attachNewController(state, workspacePaths, viewProvider, logger);
}

async function attachNewController(
  state: SessionState,
  workspacePaths: string[],
  viewProvider: CafeViewProvider,
  logger: Logger,
): Promise<void> {
  const next = createWatchController({
    workspacePaths,
    logger,
  });
  state.controller = next;
  state.detach = wireControllerListeners(next, viewProvider, logger);
  try {
    await next.start();
  } catch (error: unknown) {
    logger.error(`Failed to start transcript watch: ${formatUnknownError(error)}`);
    state.detach();
    state.controller = undefined;
    return;
  }
  triggerInitialRefresh(next, state.controller, logger);
}

function getWorkspacePaths(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
}

function wireControllerListeners(
  controller: WatchController,
  viewProvider: CafeViewProvider,
  logger: Logger,
): () => void {
  const detachEvent = controller.onEvent((event) => viewProvider.postEvent(event));
  const detachError = controller.onError((error: unknown) =>
    logger.error(`Watch refresh error: ${formatUnknownError(error)}`),
  );
  return () => {
    detachEvent();
    detachError();
  };
}

function triggerInitialRefresh(
  next: WatchController,
  current: WatchController | undefined,
  logger: Logger,
): void {
  if (current !== next) return;
  next
    .refreshNow()
    .catch((error: unknown) =>
      logger.error(`Initial refresh failed: ${formatUnknownError(error)}`),
    );
}

async function stopControllerSafely(controller: WatchController, logger: Logger): Promise<void> {
  try {
    await controller.stop();
  } catch (error: unknown) {
    logger.error(`Failed to stop transcript watch: ${formatUnknownError(error)}`);
  }
}

async function handleRefreshCommand(session: WatchSession, logger: Logger): Promise<void> {
  if (!session.currentController) {
    const message = "Open a workspace folder to enable Cursor Cafe refresh.";
    logger.warn(message);
    void vscode.window.showWarningMessage(message);
    return;
  }
  try {
    await session.currentController.refreshNow();
  } catch (error: unknown) {
    const message = `Cursor Cafe refresh failed: ${formatUnknownError(error)}`;
    logger.error(message);
    void vscode.window.showErrorMessage(message);
  }
}
