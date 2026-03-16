// import { useMemo, useRef, useEffect } from "react";
// import type { AgentLifecycleEvent, AgentSnapshot } from "@shared/types";
// import { ACTIVITY_FEED_VISIBLE_LIMIT } from "@web/helpers/constants";
// import { formatLifecycleEvent, isVisibleLifecycleEvent, lifecycleGlyph } from "@web/helpers/present";

import { useAgents } from "@web/context/agents";


export const Scene = () => {
  const { agents, lifecycleEvents, agentNames } = useAgents();

  return (
    <main className="w-full min-h-screen flex py-4">
      <div className="bg-cream flex-1 rounded-sm">

      </div>
    </main>
  );
}

// const AgentList = ({ agents }: { agents: readonly AgentSnapshot[] }) => {
//   if (agents.length === 0) {
//     return <div className="text-[#6b5f52]">No agents connected</div>;
//   }

//   return (
//     <ul className="flex flex-col gap-1">
//       {agents.map((agent) => (
//         <li key={agent.id}>
//           {agent.name} <span className="text-[#6b5f52]">({agent.status})</span>
//         </li>
//       ))}
//     </ul>
//   );
// }

// const ActivitySection = ({
//   events,
//   agentNames,
// }: {
//   events: readonly AgentLifecycleEvent[];
//   agentNames: ReadonlyMap<string, string>;
// }) => {
//   const scrollRef = useRef<HTMLDivElement | null>(null);

//   const visibleEvents = useMemo(
//     () => events.filter(isVisibleLifecycleEvent).slice(-ACTIVITY_FEED_VISIBLE_LIMIT),
//     [events],
//   );

//   useEffect(() => {
//     const node = scrollRef.current;
//     if (node) {
//       node.scrollTop = node.scrollHeight;
//     }
//   }, [visibleEvents]);

//   return (
//     <section className="flex flex-col gap-1">
//       <div className="text-[10px] font-medium text-[#b8aa96]">Activity</div>
//       {visibleEvents.length === 0 ? (
//         <div className="text-[#6b5f52]">No recent activity</div>
//       ) : (
//         <div ref={scrollRef} className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
//           {visibleEvents.map((event, index) => {
//             const label = formatLifecycleEvent(event, agentNames);
//             const glyph = lifecycleGlyph(event.kind);
//             const time = formatTime(event.at);
//             return (
//               <div key={`${event.agentId}-${event.at}-${index}`} className="flex gap-1.5 text-[10px]">
//                 <span className="shrink-0 text-[#6b5f52]">{glyph}</span>
//                 <span className="min-w-0 flex-1 truncate">{label}</span>
//                 <span className="shrink-0 tabular-nums text-[#6b5f52]">{time}</span>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </section>
//   );
// }

// const formatTime = (timestamp: number): string => {
//   const d = new Date(timestamp);
//   return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
// };

// const pad = (n: number): string => {
//   return n.toString().padStart(2, "0");
// };
