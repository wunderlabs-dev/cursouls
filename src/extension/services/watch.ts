import {
  createObserver,
  isWatchRuntimeError,
  type Observer,
  type ObserverSnapshot,
  type TranscriptProvider,
  WATCH_RUNTIME_ERROR_CODES,
} from "@agentprobe/core";
import { formatUnknownError } from "@ext/errors";
import type { Logger } from "@ext/logging";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
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
  const { store, logger, now = () => Date.now() } = options;
  const frameListeners = new Set<FrameListener>();
  const lifecycleListeners = new Set<LifecycleListener>();
  const errorListeners = new Set<ErrorListener>();

  const observer = buildObserver(options, now);

  observer.subscribe((event) => {
    try {
      const frame = applySnapshot(event.snapshot, event.snapshot.at, store);
      notifyListeners(frameListeners, frame, "frame", logger);
      notifyListeners(lifecycleListeners, [event.change], "lifecycle", logger);
    } catch (error: unknown) {
      notifyListeners(errorListeners, error, "error", logger);
    }
  });

  return {
    start: () => observer.start(),
    stop: () => observer.stop(),
    refreshNow: () => refreshNow(observer, store),
    onFrame: (listener) => addListener(frameListeners, listener),
    onLifecycleEvents: (listener) => addListener(lifecycleListeners, listener),
    onError: (listener) => addListener(errorListeners, listener),
  };
}

function buildObserver(options: WatchControllerOptions, now: () => number): Observer {
  return createObserver({
    workspacePaths: [...options.workspacePaths],
    debounceMs: options.debounceMs,
    now,
    providers: options.providers,
  });
}

async function refreshNow(observer: Observer, store?: CafeStore): Promise<SceneFrame> {
  try {
    const snapshot = await observer.refreshNow();
    return applySnapshot(snapshot, snapshot.at, store);
  } catch (error: unknown) {
    if (
      isWatchRuntimeError(error) &&
      error.code === WATCH_RUNTIME_ERROR_CODES.stoppedBeforeRefreshCompleted
    ) {
      throw new Error("Watch controller stopped before refresh completed.", { cause: error });
    }
    throw error;
  }
}

function addListener<T>(
  listeners: Set<(value: T) => void>,
  listener: (value: T) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
    } catch (error: unknown) {
      logger?.error(`Watch ${channel} listener failed: ${formatUnknownError(error)}`);
    }
  }
}

function applySnapshot(snapshot: ObserverSnapshot, at: number, store?: CafeStore): SceneFrame {
  if (!store) return toFrame(snapshot, at);
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
