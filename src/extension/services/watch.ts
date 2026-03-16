import {
  createObserver,
  isWatchRuntimeError,
  WATCH_RUNTIME_ERROR_CODES,
  type Observer,
  type ObserverSnapshot,
  type TranscriptProvider,
} from "@agentprobe/core";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import { formatUnknownError } from "@ext/errors";
import type { Logger } from "@ext/logging";
import type { CafeStore } from "./store";

export type FrameListener = (frame: SceneFrame) => void;
export type LifecycleListener = (events: AgentLifecycleEvent[]) => void;
export type ErrorListener = (error: unknown) => void;

export interface WatchControllerOptions {
  workspacePaths: readonly string[];
  store?: CafeStore;
  logger?: Logger;
  now?: () => number;
  debounceMs?: number;
  providers?: TranscriptProvider[];
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

  const frameListeners = new Set<FrameListener>();
  const lifecycleListeners = new Set<LifecycleListener>();
  const errorListeners = new Set<ErrorListener>();

  const observer: Observer = createObserver({
    workspacePaths: [...options.workspacePaths],
    debounceMs: options.debounceMs,
    now,
    providers: options.providers,
  });

  observer.subscribe((event) => {
    try {
      const frame = applySnapshot(event.snapshot, event.snapshot.at, store);
      notifyListeners(frameListeners, frame, "frame", logger);
      notifyListeners(lifecycleListeners, [event.change], "lifecycle", logger);
    } catch (error) {
      notifyListeners(errorListeners, error, "error", logger);
    }
  });

  async function refreshNow(): Promise<SceneFrame> {
    try {
      const snapshot = await observer.refreshNow();
      const frame = applySnapshot(snapshot, snapshot.at, store);
      return frame;
    } catch (error: unknown) {
      if (
        isWatchRuntimeError(error) &&
        error.code === WATCH_RUNTIME_ERROR_CODES.stoppedBeforeRefreshCompleted
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
    start: () => observer.start(),
    stop: () => observer.stop(),
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

function applySnapshot(snapshot: ObserverSnapshot, at: number, store?: CafeStore): SceneFrame {
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

function toFrame(snapshot: ObserverSnapshot, at: number): SceneFrame {
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
