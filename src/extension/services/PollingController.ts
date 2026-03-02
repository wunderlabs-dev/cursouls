import {
  DEFAULT_REFRESH_MS,
  POLLING_BACKOFF_MULTIPLIER,
  POLLING_MAX_BACKOFF_MS,
} from "../../shared/constants";
import type { AgentSnapshot, AgentSourceReadResult, SceneFrame } from "../../shared/types";
import type { Logger } from "../logging";
import type { CafeStore } from "./CafeStore";

export interface Scheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface PollingControllerOptions {
  refreshMs?: number;
  pollMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  now?: () => number;
  scheduler?: Scheduler;
  logger?: Logger;
  onFrame?: (snapshots: AgentSnapshot[]) => void;
}

export type FrameListener = (frame: SceneFrame) => void;
export type ErrorListener = (error: unknown) => void;
type SnapshotListener = (snapshots: AgentSnapshot[]) => void;

interface AgentSourceLike {
  connect(): Promise<void> | void;
  disconnect(): Promise<void> | void;
  readSnapshot(now?: number): Promise<AgentSnapshot[] | AgentSourceReadResult> | AgentSnapshot[] | AgentSourceReadResult;
}

interface PollingControllerInit extends PollingControllerOptions {
  source: AgentSourceLike;
  store?: CafeStore;
}

const DEFAULT_SCHEDULER: Scheduler = {
  setTimeout(callback: () => void, delayMs: number): unknown {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(handle: unknown): void {
    globalThis.clearTimeout(handle as number);
  },
};

export interface PollingController {
  start(): Promise<void>;
  stop(): Promise<void>;
  onFrame(listener: FrameListener): () => void;
  onError(listener: ErrorListener): () => void;
  pollOnce(): Promise<SceneFrame>;
  onSnapshot(listener: SnapshotListener): () => void;
}

export function createPollingController(
  sourceOrInit: AgentSourceLike | PollingControllerInit,
  store?: CafeStore,
  options: PollingControllerOptions = {},
): PollingController {
  const init = resolveInit(sourceOrInit, store, options);
  const source = init.source;
  const resolvedStore = init.store;
  const refreshMs = Math.max(1, init.refreshMs ?? init.pollMs ?? DEFAULT_REFRESH_MS);
  const backoffMultiplier = Math.max(1, init.backoffMultiplier ?? POLLING_BACKOFF_MULTIPLIER);
  const maxBackoffMs = Math.max(refreshMs, init.maxBackoffMs ?? POLLING_MAX_BACKOFF_MS);
  const now = init.now ?? (() => Date.now());
  const scheduler = init.scheduler ?? DEFAULT_SCHEDULER;
  const logger = init.logger;
  const initialSnapshotListener = init.onFrame;

  const frameListeners = new Set<FrameListener>();
  const errorListeners = new Set<ErrorListener>();
  const snapshotListeners = new Set<SnapshotListener>();

  let timer: unknown | null = null;
  let running = false;
  let currentDelayMs = refreshMs;

  async function start(): Promise<void> {
    if (running) {
      return;
    }

    running = true;
    currentDelayMs = refreshMs;
    try {
      await source.connect();
    } catch (error) {
      running = false;
      throw error;
    }
    logger?.info("Polling started.");
    scheduleNextPoll(refreshMs);
  }

  async function stop(): Promise<void> {
    if (!running) {
      return;
    }

    running = false;
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
    await source.disconnect();
    logger?.info("Polling stopped.");
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

  async function pollOnce(): Promise<SceneFrame> {
    const currentTime = now();
    const readResult = await source.readSnapshot(currentTime);
    const normalized = normalizeReadResult(readResult);

    if (!resolvedStore) {
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

    return resolvedStore.update(
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

  function scheduleNextPoll(delayMs: number): void {
    if (!running) {
      return;
    }
    timer = scheduler.setTimeout(() => {
      void runPollCycle();
    }, delayMs);
  }

  async function runPollCycle(): Promise<void> {
    if (!running) {
      return;
    }

    try {
      const currentTime = now();
      const readResult = await source.readSnapshot(currentTime);
      if (!running) {
        return;
      }
      const normalized = normalizeReadResult(readResult);
      const frame = resolvedStore
        ? resolvedStore.update(
            {
              agents: normalized.agents,
              health: {
                sourceConnected: normalized.connected,
                sourceLabel: normalized.sourceLabel,
                warnings: normalized.warnings,
              },
            },
            currentTime,
          )
        : {
            generatedAt: currentTime,
            seats: [],
            queue: [],
            health: {
              sourceConnected: normalized.connected,
              sourceLabel: normalized.sourceLabel,
              warnings: normalized.warnings,
            },
          };

      currentDelayMs = refreshMs;
      for (const listener of frameListeners) {
        listener(frame);
      }
      if (initialSnapshotListener) {
        initialSnapshotListener(normalized.agents);
      }
      for (const listener of snapshotListeners) {
        listener(normalized.agents);
      }
    } catch (error) {
      if (!running) {
        return;
      }
      currentDelayMs = Math.min(
        maxBackoffMs,
        Math.round(currentDelayMs * backoffMultiplier),
      );
      logger?.warn(`Polling failed; backing off to ${currentDelayMs}ms.`);
      for (const listener of errorListeners) {
        listener(error);
      }
    } finally {
      scheduleNextPoll(currentDelayMs);
    }
  }

  function onSnapshot(listener: SnapshotListener): () => void {
    snapshotListeners.add(listener);
    return () => {
      snapshotListeners.delete(listener);
    };
  }

  return {
    start,
    stop,
    onFrame,
    onError,
    pollOnce,
    onSnapshot,
  };
}

function resolveInit(
  sourceOrInit: AgentSourceLike | PollingControllerInit,
  store: CafeStore | undefined,
  options: PollingControllerOptions,
): PollingControllerInit {
  if (isInitObject(sourceOrInit)) {
    return sourceOrInit;
  }
  return {
    ...options,
    source: sourceOrInit,
    store,
  };
}

function isInitObject(value: AgentSourceLike | PollingControllerInit): value is PollingControllerInit {
  return typeof value === "object" && value !== null && "source" in value;
}

function normalizeReadResult(result: AgentSnapshot[] | AgentSourceReadResult): AgentSourceReadResult {
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
