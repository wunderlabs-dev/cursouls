import { watch } from "node:fs";
import { createAgentSubscription } from "@shared/watch/agents";
import type { WatchSnapshot } from "@shared/watch/types";
import type { AgentLifecycleEvent, AgentSnapshot, AgentSourceReadResult, SceneFrame } from "@shared/types";
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
  let running = false;
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

  subscription.subscribe((event) => {
    if (event.type === "updated") {
      const frame = applySnapshot(event.snapshot, event.snapshot.at, store);
      latestFrame = frame;
      for (const listener of frameListeners) {
        listener(frame);
      }
      for (const listener of lifecycleListeners) {
        listener([event.change]);
      }
      return;
    }

    if (event.type === "errored") {
      for (const listener of errorListeners) {
        listener(event.error);
      }
      return;
    }
  });

  async function start(): Promise<void> {
    if (running) {
      return;
    }

    running = true;
    try {
      await subscription.start();
    } catch (error) {
      running = false;
      throw error;
    }
  }

  async function stop(): Promise<void> {
    if (!running) {
      return;
    }

    running = false;
    await subscription.stop();
  }

  function refreshNow(): Promise<SceneFrame> {
    if (!running) {
      return Promise.reject(new Error("Watch controller is not running."));
    }
    return subscription.refreshNow().then((snapshot) => {
      if (latestFrame) {
        return latestFrame;
      }
      return toFrame(
        {
          agents: snapshot.agents,
          health: snapshot.health,
        },
        snapshot.at,
      );
    }).catch((error: unknown) => {
      if (
        error instanceof Error &&
        error.message === "Watch runtime stopped before refresh completed."
      ) {
        throw new Error("Watch controller stopped before refresh completed.");
      }
      throw error;
    });
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

function createDefaultWatcher(watchPath: string, onEvent: () => void): WatcherLike {
  const watcher = watch(watchPath, { persistent: false }, () => {
    onEvent();
  });
  return watcher;
}

function applySnapshot(snapshot: WatchSnapshot<AgentSnapshot>, at: number, store?: CafeStore): SceneFrame {
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

function toFrame(snapshot: WatchSnapshot<AgentSnapshot>, at: number): SceneFrame {
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

