import { initialsFor, statusGlyph } from "@web/present";
import {
  AGENT_LABEL_CLASS,
  AGENT_LEGS_CLASS,
  AGENT_OUTLINE_CLASS,
  AGENT_SHADOW_CLASS,
  AGENT_SHADOW_HOVER_CLASS,
  AGENT_SKIN_CLASS,
  bodyColorVariants,
  statusBadgeVariants,
} from "@web/scene/constants";
import type { CafeSceneModel, SeatRenderModel } from "@web/scene/model";
import type { JSX } from "react";

interface SceneAgentsProps {
  sceneModel: CafeSceneModel;
  onSeatClick: (agentId: string) => void;
}

export function SceneAgents({ sceneModel, onSeatClick }: SceneAgentsProps): JSX.Element {
  return (
    <>
      {sceneModel.seats.map((seat) =>
        seat.agent ? (
          <AgentSprite
            key={`${seat.tableIndex}-${seat.agent.id}`}
            seat={seat}
            onSeatClick={onSeatClick}
          />
        ) : null,
      )}
    </>
  );
}

function AgentSprite({
  seat,
  onSeatClick,
}: {
  seat: SeatRenderModel;
  onSeatClick: (id: string) => void;
}): JSX.Element {
  const agent = seat.agent;
  if (!agent) throw new Error("AgentSprite rendered without agent");

  return (
    <button
      type="button"
      onClick={() => onSeatClick(agent.id)}
      className="group absolute animate-cafe-enter text-left"
      style={{ left: seat.x, top: seat.y, width: seat.width, height: seat.height }}
      aria-label={`Agent ${agent.name}, status ${agent.status}`}
    >
      <div
        className={`absolute left-1/2 top-[60%] h-4 w-11 -translate-x-1/2 rounded-full transition-colors duration-300 ${AGENT_SHADOW_CLASS} ${AGENT_SHADOW_HOVER_CLASS}`}
      />
      <div className={statusBadgeVariants({ status: agent.status })}>
        {statusGlyph(agent.status)}
      </div>
      <div
        className={`absolute left-1/2 top-[40%] h-9 w-7 -translate-x-1/2 rounded-sm border-2 ${AGENT_OUTLINE_CLASS} ${AGENT_SKIN_CLASS}`}
      />
      <div className={bodyColorVariants({ status: agent.status })} />
      <div
        className={`absolute left-1/2 top-[63%] h-2 w-10 -translate-x-1/2 rounded ${AGENT_LEGS_CLASS}`}
      />
      <div
        className={`absolute left-1/2 top-[9%] -translate-x-1/2 rounded px-1.5 py-0.5 text-[9px] ${AGENT_LABEL_CLASS}`}
      >
        {initialsFor(agent.name)}
      </div>
    </button>
  );
}
