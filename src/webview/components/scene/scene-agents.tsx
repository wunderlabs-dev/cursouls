import type { SceneFrame, SeatFrame } from "@shared/types";
import type { CafeSceneModel } from "@web/scene/model";
import { STATUS_STYLE } from "@web/scene/constants";
import { initialsFor, statusGlyph } from "@web/present";

interface SceneAgentsProps {
  frame?: SceneFrame;
  sceneModel: CafeSceneModel;
  onSeatClick: (agentId: string) => void;
}

export function SceneAgents({ frame, sceneModel, onSeatClick }: SceneAgentsProps) {
  const seatByTable = new Map<number, SeatFrame>();
  frame?.seats.forEach((seat) => seatByTable.set(seat.tableIndex, seat));

  return (
    <>
      {sceneModel.seats.map((seat) => {
        const mapped = seatByTable.get(seat.tableIndex);
        const agent = mapped?.agent ?? seat.agent;
        if (!agent) {
          return null;
        }
        const statusClass = STATUS_STYLE[agent.status] ?? STATUS_STYLE.idle;
        return (
          <button
            key={seat.tableIndex}
            type="button"
            onClick={() => onSeatClick(agent.id)}
            className="group absolute text-left"
            style={{ left: seat.x, top: seat.y, width: seat.width, height: seat.height }}
            aria-label={`Agent ${agent.name}, status ${agent.status}`}
          >
            <div className="absolute left-1/2 top-[60%] h-4 w-11 -translate-x-1/2 rounded-full bg-black/20 group-hover:bg-black/30" />
            <div
              className={`absolute left-1/2 top-[26%] -translate-x-1/2 rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${statusClass}`}
            >
              {statusGlyph(agent.status)}
            </div>
            <div className="absolute left-1/2 top-[40%] h-9 w-7 -translate-x-1/2 rounded-sm border-2 border-[#2f2620] bg-[#ebc39f]" />
            <div
              className={`absolute left-1/2 top-[55%] h-6 w-8 -translate-x-1/2 rounded-sm border-2 border-[#2f2620] ${
                agent.status === "running"
                  ? "bg-[#5fa26a]"
                  : agent.status === "completed"
                    ? "bg-[#4c8f5f]"
                    : agent.status === "error"
                      ? "bg-[#8f4c4c]"
                      : "bg-[#5c7b96]"
              }`}
            />
            <div className="absolute left-1/2 top-[63%] h-2 w-10 -translate-x-1/2 rounded bg-[#2b3942]" />
            <div className="absolute left-1/2 top-[9%] -translate-x-1/2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-[#f5ecdd]">
              {initialsFor(agent.name)}
            </div>
          </button>
        );
      })}
    </>
  );
}
