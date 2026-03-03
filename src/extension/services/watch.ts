import { watch } from "node:fs";
import {
  AGENT_SUBSCRIPTION_EVENT_TYPES,
  WATCH_RUNTIME_ERROR_CODES,
  WATCH_RUNTIME_ERROR_MESSAGES,
  createAgentSubscription,
  isWatchRuntimeError,
  type AgentStateSnapshot,
} from "@shared/watch";
import type { AgentLifecycleEvent, AgentSourceReadResult, SceneFrame } from "@shared/types";
import type { Logger } from "@ext/logging";
import type { CafeStore } from "./store";

const DEFAULT_DEBOUNCE_MS = 150;

export type FrameListener = (frame: SceneFrame) => void;
export type LifecycleListener = (events: AgentLifecycleEvent[]) => void;
export type ErrorListener = (error: unknown) => void;

interface AgentSourceLike {
  connect(): Promise<void> | void;
  disconnect(): Promise<void> | void;
  readSnapshot(now?: number): Promise<AgentSourceReadResult> | AgentSourceReadResult;
  getWatchPaths?(): string[];
}

export interface WatchControllerOptions {
  projectPath: string;
  store?: CafeStore;
  logger?: Logger;
  now?: () => number;
  debounceMs?: number;
  sourceFactory?: (projectPath: string) => AgentSourceLike;
  watchFactory?: (watchPath: string, onEvent: () => void) => WatcherLike;
}

interface WatcherLike {
  close(): void;
  on(event: "error", listener: (error: Error) => void): void;
}

export interface WatchController {
  start(): Promise<void>;
  stop(): Promise<void>;
  refreshNow(): Promise<SceneFrame>;
  onFrame(listener: FrameListener): () => void;
  onLifecycleEvents(listener: LifecycleListener): () => void;
  onError(listener: ErrorListener): () => void;
}

export function createWatchController(options: WatchControllerOptions): WatchController {
  const store = options.store;
  const logger = options.logger;
  const now = options.now ?? (() => Date.now());
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const watchFactory = options.watchFactory ?? createDefaultWatcher;
  const sourceFactory = options.sourceFactory;

  const frameListeners = new Set<FrameListener>();
  const lifecycleListeners = new Set<LifecycleListener>();
  const errorListeners = new Set<ErrorListener>();
  let state: "stopped" | "starting" | "started" | "stopping" = "stopped";
  let startPromise: Promise<void> | null = null;
  let stopPromise: Promise<void> | null = null;
  let latestFrame: SceneFrame | undefined;

  const subscription = createAgentSubscription({
    projectPath: options.projectPath,
    debounceMs,
    now,
    sourceFactory,
    watchFactory: (watchPath, onEvent) => {
      const watcher = watchFactory(watchPath, onEvent);
      logger?.info(`Watching transcript path: ${watchPath}`);
      return watcher;
    },
  });

  subscription.subscribeToSnapshots((event) => {
    const frame = applySnapshot(event.snapshot, event.snapshot.at, store);
    latestFrame = frame;
    notifyListeners(frameListeners, frame, "frame", logger);
  });

  subscription.subscribeToAgentChanges((event) => {
    notifyListeners(lifecycleListeners, [event.change], "lifecycle", logger);
  });

  subscription.subscribe((event) => {
    if (event.type === AGENT_SUBSCRIPTION_EVENT_TYPES.errored) {
      notifyListeners(errorListeners, event.error, "error", logger);
    }
  });

  async function start(): Promise<void> {
    if (state === "started") {
      return;
    }
    if (state === "starting" && startPromise) {
      return startPromise;
    }
    if (state === "stopping" && stopPromise) {
      await stopPromise;
    }

    state = "starting";
    const operation = (async () => {
      try {
        await subscription.start();
        state = "started";
      } catch (error) {
        state = "stopped";
        throw error;
      }
    })();
    startPromise = operation;
    try {
      await operation;
    } finally {
      if (startPromise === operation) {
        startPromise = null;
      }
    }
  }

  async function stop(): Promise<void> {
    if (state === "stopped") {
      return;
    }
    if (state === "stopping" && stopPromise) {
      return stopPromise;
    }
    if (state === "starting" && startPromise) {
      try {
        await startPromise;
      } catch {
        // Continue stopping after failed startup.
      }
    }

    state = "stopping";
    const operation = (async () => {
      try {
        await subscription.stop();
      } finally {
        state = "stopped";
      }
    })();
    stopPromise = operation;
    try {
      await operation;
    } finally {
      if (stopPromise === operation) {
        stopPromise = null;
      }
    }
  }

  async function refreshNow(): Promise<SceneFrame> {
    if (state === "starting" && startPromise) {
      await startPromise;
    }
    if (state !== "started") {
      return Promise.reject(new Error("Watch controller is not running."));
    }
    try {
      const snapshot = await subscription.refreshNow();
      const frame = applySnapshot(snapshot, snapshot.at, store);
      latestFrame = frame;
      return frame;
    } catch (error: unknown) {
      if (
        isWatchRuntimeError(error) &&
        error.code === WATCH_RUNTIME_ERROR_CODES.stoppedBeforeRefreshCompleted
      ) {
        throw new Error("Watch controller stopped before refresh completed.");
      }
      if (
        error instanceof Error &&
        error.message === WATCH_RUNTIME_ERROR_MESSAGES.stoppedBeforeRefreshCompleted
      ) {
        throw new Error("Watch controller stopped before refresh completed.");
      }
      throw error;
    }
  }

  function onFrame(listener: FrameListener): () => void {
    frameListeners.add(listener);
    return () => {
      frameListeners.delete(listener);
    };
  }

  function onLifecycleEvents(listener: LifecycleListener): () => void {
    lifecycleListeners.add(listener);
    return () => {
      lifecycleListeners.delete(listener);
    };
  }

  function onError(listener: ErrorListener): () => void {
    errorListeners.add(listener);
    return () => {
      errorListeners.delete(listener);
    };
  }

  return {
    start,
    stop,
    refreshNow,
    onFrame,
    onLifecycleEvents,
    onError,
  };
}

function notifyListeners<T>(
  listeners: Set<(value: T) => void>,
  payload: T,
  channel: "frame" | "lifecycle" | "error",
  logger?: Logger,
): void {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      logger?.error(`Watch ${channel} listener failed: ${formatUnknownError(error)}`);
    }
  }
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function createDefaultWatcher(watchPath: string, onEvent: () => void): WatcherLike {
  const watcher = watch(watchPath, { persistent: false }, () => {
    onEvent();
  });
  return watcher;
}

function applySnapshot(snapshot: AgentStateSnapshot, at: number, store?: CafeStore): SceneFrame {
  if (!store) {
    return toFrame(snapshot, at);
  }
  return store.update(
    {
      agents: snapshot.agents,
      health: {
        sourceConnected: snapshot.health.connected,
        sourceLabel: snapshot.health.sourceLabel,
        warnings: snapshot.health.warnings,
      },
    },
    at,
  );
}

function toFrame(snapshot: AgentStateSnapshot, at: number): SceneFrame {
  return {
    generatedAt: at,
    seats: [],
    queue: [],
    health: {
      sourceConnected: snapshot.health.connected,
      sourceLabel: snapshot.health.sourceLabel,
      warnings: snapshot.health.warnings,
    },
  };
}

