import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneFrame, SeatFrame } from "@shared/types";
import { buildSceneComposition } from "@web/scene/composition";
import { buildCafeSceneModel } from "@web/scene/model";
import { initialsFor, statusGlyph } from "@web/present";

interface CafeSceneProps {
  frame?: SceneFrame;
  onSeatClick: (agentId: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  running: "border-emerald-500 bg-emerald-300/20 text-emerald-200 animate-pulse",
  idle: "border-stone-500 bg-stone-300/10 text-stone-200",
  completed: "border-teal-500 bg-teal-300/20 text-teal-200",
  error: "border-red-500 bg-red-300/20 text-red-200 animate-bounce",
};

export function CafeScene({ frame, onSeatClick }: CafeSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 460 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const sync = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(360, Math.floor(rect.width)),
        height: Math.max(280, Math.floor(rect.height)),
      });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const composition = useMemo(
    () => buildSceneComposition(size.width, size.height),
    [size.height, size.width],
  );

  const sceneModel = useMemo(() => {
    const seatingRegion = {
      width: Math.max(420, composition.width - composition.tileSize),
      height: Math.max(320, composition.height - composition.tileSize * 3.2),
      offsetX: composition.originX + composition.tileSize * 0.4,
      offsetY: composition.originY + composition.tileSize * 2.4,
      preferredTableOrigins: composition.cells
        .filter((cell) => cell.symbol === "t")
        .map((cell) => ({
          x: cell.x - composition.tileSize * 0.2,
          y: cell.y + composition.tileSize * 0.38,
        })),
    };
    return buildCafeSceneModel(frame, seatingRegion);
  }, [composition, frame]);

  const seatByTable = useMemo(() => {
    const map = new Map<number, SeatFrame>();
    frame?.seats.forEach((seat) => {
      map.set(seat.tableIndex, seat);
    });
    return map;
  }, [frame?.seats]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-lg bg-[#1b1411]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#281e18] to-[#18120f]" />
      {composition.cells.map((cell) => {
        const baseClass =
          cell.row < 3 || cell.symbol === "W" || cell.symbol === "w" || cell.symbol === "C"
            ? "bg-[#7f4f33]"
            : "bg-[#b98958]";
        return (
          <div
            key={`${cell.row}-${cell.column}`}
            className={`absolute border border-[#4f3a2d]/65 ${baseClass}`}
            style={{ left: cell.x, top: cell.y, width: cell.size, height: cell.size }}
          />
        );
      })}

      {composition.cells
        .filter((cell) => cell.symbol === "t")
        .map((cell) => (
          <div
            key={`table-${cell.row}-${cell.column}`}
            className="absolute rounded-md border-2 border-[#54453a] bg-[#b78f67] shadow-[0_4px_0_0_#3f3129]"
            style={{
              left: cell.x - cell.size * 0.25,
              top: cell.y - cell.size * 0.35,
              width: cell.size * 1.5,
              height: cell.size * 1.5,
            }}
          />
        ))}

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
    </div>
  );
}
