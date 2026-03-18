import {
  createObserver,
  isWatchRuntimeError,
  type Observer,
  type TranscriptProvider,
  WATCH_LIFECYCLE_KIND,
  WATCH_RUNTIME_ERROR_CODES,
} from "@agentprobe/core";
import { formatUnknownError } from "@ext/errors";
import type { Logger } from "@ext/logging";
import type { AgentEvent } from "@shared/types";
import { EVENT_KIND } from "@shared/types";

export type EventListener = (event: AgentEvent) => void;
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
  refreshNow(): Promise<void>;
  onEvent(listener: EventListener): () => void;
  onError(listener: ErrorListener): () => void;
}

const LIFECYCLE_TO_EVENT: Record<string, AgentEvent["kind"] | undefined> = {
  [WATCH_LIFECYCLE_KIND.joined]: EVENT_KIND.joined,
  [WATCH_LIFECYCLE_KIND.statusChanged]: EVENT_KIND.statusChanged,
  [WATCH_LIFECYCLE_KIND.left]: EVENT_KIND.left,
};

export function createWatchController(options: WatchControllerOptions): WatchController {
  const { logger } = options;
  const eventListeners = new Set<EventListener>();
  const errorListeners = new Set<ErrorListener>();

  const observer = buildObserver(options);

  observer.subscribe((event) => {
    try {
      const kind = LIFECYCLE_TO_EVENT[event.change.kind];
      if (!kind) return;

      const agent = event.agent;
      const agentEvent: AgentEvent = {
        kind,
        agent: { id: agent.id, status: agent.status, taskSummary: agent.taskSummary },
      };
      notifyListeners(eventListeners, agentEvent, "event", logger);
    } catch (error: unknown) {
      notifyListeners(errorListeners, error, "error", logger);
    }
  });

  return {
    start: () => observer.start(),
    stop: () => observer.stop(),
    refreshNow: () => refreshNow(observer),
    onEvent: (listener) => addListener(eventListeners, listener),
    onError: (listener) => addListener(errorListeners, listener),
  };
}

async function refreshNow(observer: Observer): Promise<void> {
  try {
    await observer.refreshNow();
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
