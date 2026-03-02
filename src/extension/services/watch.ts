import { watch } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { AgentSnapshot, AgentSourceReadResult, SceneFrame } from "@shared/types";
import type { Logger } from "@ext/logging";
import type { CafeStore } from "./store";

const DEFAULT_DEBOUNCE_MS = 150;

export type FrameListener = (frame: SceneFrame) => void;
export type ErrorListener = (error: unknown) => void;

interface AgentSourceLike {
  connect(): Promise<void> | void;
  disconnect(): Promise<void> | void;
  readSnapshot(
    now?: number,
  ): Promise<AgentSnapshot[] | AgentSourceReadResult> | AgentSnapshot[] | AgentSourceReadResult;
  getWatchPaths?(): string[];
}

export interface WatchControllerOptions {
  source: AgentSourceLike;
  store?: CafeStore;
  logger?: Logger;
  now?: () => number;
  debounceMs?: number;
  watchPaths?: string[];
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
  onError(listener: ErrorListener): () => void;
}

export function createWatchController(options: WatchControllerOptions): WatchController {
  const source = options.source;
  const store = options.store;
  const logger = options.logger;
  const now = options.now ?? (() => Date.now());
  const debounceMs = Math.max(10, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  const watchFactory = options.watchFactory ?? createDefaultWatcher;
  const sourceWatchPaths = source.getWatchPaths?.() ?? [];
  const configuredWatchPaths =
    options.watchPaths && options.watchPaths.length > 0 ? options.watchPaths : sourceWatchPaths;

  const frameListeners = new Set<FrameListener>();
  const errorListeners = new Set<ErrorListener>();
  const watchers: WatcherLike[] = [];

  let running = false;
  let pendingRefresh = false;
  let refreshLoop: Promise<void> | null = null;
  let debounceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let manualWaiters: Array<{ resolve: (frame: SceneFrame) => void; reject: (error: unknown) => void }> =
    [];

  async function start(): Promise<void> {
    if (running) {
      return;
    }

    running = true;
    try {
      await source.connect();
      await initializeWatchers();
      queueRefresh();
    } catch (error) {
      running = false;
      await closeWatchers();
      throw error;
    }
  }

  async function stop(): Promise<void> {
    if (!running) {
      return;
    }

    running = false;
    if (debounceTimer) {
      globalThis.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await closeWatchers();
    const waiters = manualWaiters;
    manualWaiters = [];
    rejectWaiters(waiters, new Error("Watch controller stopped before refresh completed."));
    await source.disconnect();
  }

  function onFrame(listener: FrameListener): () => void {
    frameListeners.add(listener);
    return () => {
      frameListeners.delete(listener);
    };
  }

  function onError(listener: ErrorListener): () => void {
    errorListeners.add(listener);
    return () => {
      errorListeners.delete(listener);
    };
  }

  function refreshNow(): Promise<SceneFrame> {
    if (!running) {
      return Promise.reject(new Error("Watch controller is not running."));
    }
    return new Promise<SceneFrame>((resolve, reject) => {
      manualWaiters.push({ resolve, reject });
      queueRefresh();
    });
  }

  function queueRefresh(): void {
    if (!running) {
      return;
    }

    pendingRefresh = true;
    if (!refreshLoop) {
      refreshLoop = runRefreshLoop().finally(() => {
        refreshLoop = null;
        if (running && pendingRefresh) {
          queueRefresh();
        }
      });
    }
  }

  async function runRefreshLoop(): Promise<void> {
    while (running && pendingRefresh) {
      pendingRefresh = false;
      const waitersForCycle = manualWaiters;
      manualWaiters = [];

      try {
        const frame = await readFrame();
        if (!running) {
          rejectWaiters(waitersForCycle, new Error("Watch controller stopped before refresh completed."));
          return;
        }
        for (const listener of frameListeners) {
          listener(frame);
        }
        resolveWaiters(waitersForCycle, frame);
      } catch (error) {
        for (const listener of errorListeners) {
          listener(error);
        }
        rejectWaiters(waitersForCycle, error);
      }
    }
  }

  async function readFrame(): Promise<SceneFrame> {
    const currentTime = now();
    const readResult = await source.readSnapshot(currentTime);
    const normalized = normalizeReadResult(readResult);
    if (!store) {
      return {
        generatedAt: currentTime,
        seats: [],
        queue: [],
        health: {
          sourceConnected: normalized.connected,
          sourceLabel: normalized.sourceLabel,
          warnings: normalized.warnings,
        },
      };
    }

    return store.update(
      {
        agents: normalized.agents,
        health: {
          sourceConnected: normalized.connected,
          sourceLabel: normalized.sourceLabel,
          warnings: normalized.warnings,
        },
      },
      currentTime,
    );
  }

  async function initializeWatchers(): Promise<void> {
    const roots = await resolveWatchRoots(configuredWatchPaths);
    for (const root of roots) {
      const watcher = watchFactory(root, onWatchedChange);
      watcher.on("error", (error) => {
        for (const listener of errorListeners) {
          listener(error);
        }
      });
      watchers.push(watcher);
      logger?.info(`Watching transcript path: ${root}`);
    }
  }

  function onWatchedChange(): void {
    if (!running) {
      return;
    }
    if (debounceTimer) {
      globalThis.clearTimeout(debounceTimer);
    }
    debounceTimer = globalThis.setTimeout(() => {
      debounceTimer = null;
      queueRefresh();
    }, debounceMs);
  }

  async function closeWatchers(): Promise<void> {
    const activeWatchers = watchers.splice(0, watchers.length);
    for (const watcher of activeWatchers) {
      watcher.close();
    }
  }

  return {
    start,
    stop,
    refreshNow,
    onFrame,
    onError,
  };
}

function createDefaultWatcher(watchPath: string, onEvent: () => void): WatcherLike {
  const watcher = watch(watchPath, { persistent: false }, () => {
    onEvent();
  });
  return watcher;
}

async function resolveWatchRoots(sourcePaths: readonly string[]): Promise<string[]> {
  const roots = new Set<string>();
  for (const sourcePath of sourcePaths) {
    const trimmed = sourcePath.trim();
    if (trimmed.length === 0) {
      continue;
    }

    let isDirectory = false;
    try {
      const stats = await stat(trimmed);
      isDirectory = stats.isDirectory();
    } catch {
      // Fall back to parent directory when stat fails.
    }

    roots.add(isDirectory ? trimmed : path.dirname(trimmed));
  }
  return Array.from(roots);
}

function normalizeReadResult(
  result: AgentSnapshot[] | AgentSourceReadResult,
): AgentSourceReadResult {
  if (Array.isArray(result)) {
    return {
      agents: result,
      connected: true,
      sourceLabel: "direct",
      warnings: [],
    };
  }
  return {
    agents: result.agents ?? [],
    connected: result.connected,
    sourceLabel: result.sourceLabel,
    warnings: result.warnings ?? [],
  };
}

function resolveWaiters(
  waiters: Array<{ resolve: (frame: SceneFrame) => void; reject: (error: unknown) => void }>,
  frame: SceneFrame,
): void {
  for (const waiter of waiters) {
    waiter.resolve(frame);
  }
}

function rejectWaiters(
  waiters: Array<{ resolve: (frame: SceneFrame) => void; reject: (error: unknown) => void }>,
  error: unknown,
): void {
  for (const waiter of waiters) {
    waiter.reject(error);
  }
}

