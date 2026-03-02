import type { AgentSourceKind, AgentSourceReadResult } from "../types";

export interface AgentSource {
  readonly sourceKind: AgentSourceKind;
  connect(): Promise<void> | void;
  disconnect(): Promise<void> | void;
  readSnapshot(now?: number): Promise<AgentSourceReadResult> | AgentSourceReadResult;
}
