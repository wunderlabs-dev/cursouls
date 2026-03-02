import {
  DEFAULT_REFRESH_MS,
  POLLING_BACKOFF_MULTIPLIER,
  POLLING_MAX_BACKOFF_MS,
} from "../constants";
import type { Logger } from "../logging";
import type { AgentSnapshot, AgentSourceReadResult, SceneFrame } from "../types";
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

export class PollingController {
  private readonly source: AgentSourceLike;
  private readonly store?: CafeStore;
  private readonly refreshMs: number;
  private readonly backoffMultiplier: number;
  private readonly maxBackoffMs: number;
  private readonly now: () => number;
  private readonly scheduler: Scheduler;
  private readonly logger?: Logger;
  private readonly initialSnapshotListener?: SnapshotListener;

  private readonly frameListeners = new Set<FrameListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly snapshotListeners = new Set<SnapshotListener>();

  private timer: unknown | null = null;
  private running = false;
  private currentDelayMs: number;

  public constructor(
    sourceOrInit: AgentSourceLike | PollingControllerInit,
    store?: CafeStore,
    options: PollingControllerOptions = {},
  ) {
    const init = this.resolveInit(sourceOrInit, store, options);

    this.source = init.source;
    this.store = init.store;
    this.refreshMs = Math.max(1, init.refreshMs ?? init.pollMs ?? DEFAULT_REFRESH_MS);
    this.backoffMultiplier = Math.max(1, init.backoffMultiplier ?? POLLING_BACKOFF_MULTIPLIER);
    this.maxBackoffMs = Math.max(this.refreshMs, init.maxBackoffMs ?? POLLING_MAX_BACKOFF_MS);
    this.now = init.now ?? (() => Date.now());
    this.scheduler = init.scheduler ?? DEFAULT_SCHEDULER;
    this.logger = init.logger;
    this.initialSnapshotListener = init.onFrame;
    this.currentDelayMs = this.refreshMs;
  }

  public async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.currentDelayMs = this.refreshMs;
    await this.source.connect();
    this.logger?.info("Polling started.");
    this.scheduleNextPoll(this.refreshMs);
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.timer !== null) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
    await this.source.disconnect();
    this.logger?.info("Polling stopped.");
  }

  public onFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  public async pollOnce(): Promise<SceneFrame> {
    const now = this.now();
    const readResult = await this.source.readSnapshot(now);
    const normalized = this.normalizeReadResult(readResult);

    if (!this.store) {
      return {
        generatedAt: now,
        seats: [],
        queue: [],
        health: {
          sourceConnected: normalized.connected,
          sourceLabel: normalized.sourceLabel,
          warnings: normalized.warnings,
        },
      };
    }

    return this.store.update(
      {
        agents: normalized.agents,
        health: {
          sourceConnected: normalized.connected,
          sourceLabel: normalized.sourceLabel,
          warnings: normalized.warnings,
        },
      },
      now,
    );
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.running) {
      return;
    }
    this.timer = this.scheduler.setTimeout(() => {
      void this.runPollCycle();
    }, delayMs);
  }

  private async runPollCycle(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const now = this.now();
      const readResult = await this.source.readSnapshot(now);
      const normalized = this.normalizeReadResult(readResult);
      const frame = this.store
        ? this.store.update(
            {
              agents: normalized.agents,
              health: {
                sourceConnected: normalized.connected,
                sourceLabel: normalized.sourceLabel,
                warnings: normalized.warnings,
              },
            },
            now,
          )
        : {
            generatedAt: now,
            seats: [],
            queue: [],
            health: {
              sourceConnected: normalized.connected,
              sourceLabel: normalized.sourceLabel,
              warnings: normalized.warnings,
            },
          };

      this.currentDelayMs = this.refreshMs;
      for (const listener of this.frameListeners) {
        listener(frame);
      }
      if (this.initialSnapshotListener) {
        this.initialSnapshotListener(normalized.agents);
      }
      for (const listener of this.snapshotListeners) {
        listener(normalized.agents);
      }
    } catch (error) {
      this.currentDelayMs = Math.min(
        this.maxBackoffMs,
        Math.round(this.currentDelayMs * this.backoffMultiplier),
      );
      this.logger?.warn(`Polling failed; backing off to ${this.currentDelayMs}ms.`);
      for (const listener of this.errorListeners) {
        listener(error);
      }
    } finally {
      this.scheduleNextPoll(this.currentDelayMs);
    }
  }

  public onSnapshot(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  private resolveInit(
    sourceOrInit: AgentSourceLike | PollingControllerInit,
    store: CafeStore | undefined,
    options: PollingControllerOptions,
  ): PollingControllerInit {
    if (this.isInitObject(sourceOrInit)) {
      return sourceOrInit;
    }
    return {
      ...options,
      source: sourceOrInit,
      store,
    };
  }

  private isInitObject(value: AgentSourceLike | PollingControllerInit): value is PollingControllerInit {
    return typeof value === "object" && value !== null && "source" in value;
  }

  private normalizeReadResult(result: AgentSnapshot[] | AgentSourceReadResult): AgentSourceReadResult {
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
}
