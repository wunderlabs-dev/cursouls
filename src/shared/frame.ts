import type { AgentSnapshot, SceneFrame } from "./types";

export function findAgentInFrame(frame: SceneFrame | undefined, agentId: string): AgentSnapshot | undefined {
  if (!frame) {
    return undefined;
  }
  const seated = frame.seats
    .map((seat) => seat.agent)
    .find((agent): agent is AgentSnapshot => Boolean(agent && agent.id === agentId));
  const queued = frame.queue.find((agent) => agent.id === agentId);
  return seated ?? queued;
}
