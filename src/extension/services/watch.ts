import {
  type CanonicalAgentSnapshot,
  createObserver,
  isWatchRuntimeError,
  type Observer,
  type TranscriptProvider,
  WATCH_RUNTIME_ERROR_CODES,
} from "@agentprobe/core";
import { formatUnknownError } from "@ext/errors";
import type { Logger } from "@ext/logging";

export type AgentsListener = (agents: CanonicalAgentSnapshot[]) => void;
export type ErrorListener = (error: unknown) => void;

export interface WatchControllerOptions {
  workspacePaths: readonly string[];
  logger?: Logger;
  now?: () => number;
  debounceMs?: number;
  providers?: TranscriptProvider[];
}

export interface WatchController {
  start(): Promise<void>;
  stop(): Promise<void>;
  refreshNow(): Promise<CanonicalAgentSnapshot[]>;
  onAgents(listener: AgentsListener): () => void;
  onError(listener: ErrorListener): () => void;
}

export function createWatchController(options: WatchControllerOptions): WatchController {
  const { logger } = options;
  const agentsListeners = new Set<AgentsListener>();
  const errorListeners = new Set<ErrorListener>();

  const observer = buildObserver(options);

  observer.subscribe((event) => {
    try {
      notifyListeners(agentsListeners, event.snapshot.agents, "agents", logger);
    } catch (error: unknown) {
      notifyListeners(errorListeners, error, "error", logger);
    }
  });

  return {
    start: () => observer.start(),
    stop: () => observer.stop(),
    refreshNow: () => refreshNow(observer),
    onAgents: (listener) => addListener(agentsListeners, listener),
    onError: (listener) => addListener(errorListeners, listener),
  };
}

async function refreshNow(observer: Observer): Promise<CanonicalAgentSnapshot[]> {
  try {
    const snapshot = await observer.refreshNow();
    return snapshot.agents;
  } catch (error: unknown) {
    if (isStoppedBeforeRefresh(error)) {
      throw new Error("Watch controller stopped before refresh completed.", { cause: error });
    }
    throw error;
  }
}

function isStoppedBeforeRefresh(error: unknown): boolean {
  return (
    isWatchRuntimeError(error) &&
    error.code === WATCH_RUNTIME_ERROR_CODES.stoppedBeforeRefreshCompleted
  );
}

function buildObserver(options: WatchControllerOptions): Observer {
  return createObserver({
    workspacePaths: [...options.workspacePaths],
    debounceMs: options.debounceMs,
    now: options.now,
    providers: options.providers,
  });
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
  channel: string,
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
