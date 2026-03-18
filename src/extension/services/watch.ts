import {
  createObserver,
  isWatchRuntimeError,
  type Observer,
  type TranscriptProvider,
  WATCH_RUNTIME_ERROR_CODES,
} from "@agentprobe/core";
import { formatUnknownError } from "@ext/errors";
import type { Logger } from "@ext/logging";
import type { Actor, AgentStatus } from "@shared/types";
import { AGENT_STATUS } from "@shared/types";

export type ActorsListener = (actors: Actor[]) => void;
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
  refreshNow(): Promise<Actor[]>;
  onActors(listener: ActorsListener): () => void;
  onError(listener: ErrorListener): () => void;
}

interface Baseline {
  captured: boolean;
  ids: Set<string>;
}

export function createWatchController(options: WatchControllerOptions): WatchController {
  const { logger } = options;
  const actorsListeners = new Set<ActorsListener>();
  const errorListeners = new Set<ErrorListener>();
  const baseline: Baseline = { captured: false, ids: new Set() };

  const observer = buildObserver(options);

  observer.subscribe((event) => {
    try {
      const actors = filterNewActors(deriveActors(event.snapshot.agents), baseline);
      notifyListeners(actorsListeners, actors, "actors", logger);
    } catch (error: unknown) {
      notifyListeners(errorListeners, error, "error", logger);
    }
  });

  return {
    start: () => observer.start(),
    stop: () => observer.stop(),
    refreshNow: () => refreshNow(observer, baseline),
    onActors: (listener) => addListener(actorsListeners, listener),
    onError: (listener) => addListener(errorListeners, listener),
  };
}

async function refreshNow(observer: Observer, baseline: Baseline): Promise<Actor[]> {
  try {
    const snapshot = await observer.refreshNow();
    return filterNewActors(deriveActors(snapshot.agents), baseline);
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

function filterNewActors(eligible: Actor[], baseline: Baseline): Actor[] {
  if (!baseline.captured) {
    baseline.captured = true;
    for (const a of eligible) baseline.ids.add(a.id);
    return [];
  }
  return eligible.filter((a) => !baseline.ids.has(a.id));
}

function buildObserver(options: WatchControllerOptions): Observer {
  return createObserver({
    workspacePaths: [...options.workspacePaths],
    debounceMs: options.debounceMs,
    now: options.now,
    providers: options.providers,
  });
}

interface EligibleAgent {
  readonly id: string;
  readonly status: AgentStatus;
  readonly isSubagent: boolean;
  readonly taskSummary: string;
}

function deriveActors(agents: readonly EligibleAgent[]): Actor[] {
  return agents
    .filter((agent) => isSeatEligible(agent))
    .map((agent) => ({ id: agent.id, status: agent.status, taskSummary: agent.taskSummary }));
}

function isSeatEligible(agent: EligibleAgent): boolean {
  if (agent.status === AGENT_STATUS.running) return true;
  if (agent.status === AGENT_STATUS.completed) return true;
  if (agent.status === AGENT_STATUS.error) return true;
  if (agent.status !== AGENT_STATUS.idle) return false;
  return !agent.isSubagent;
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
