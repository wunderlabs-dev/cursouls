export const AGENT_SKINS = ["agent-01", "agent-02", "agent-03", "agent-04"] as const;

export const SCENE_GRID: (string | null)[] = [
  null,
  "vertical-table-01",
  null,
  "plant",
  null,
  null,
  "round-table-02",
  null,
  null,
  null,
  "plant",
  null,
  "round-table-01",
  null,
  null,
  "vertical-table-03",
  null,
  "vertical-table-02",
  null,
  null,
  null,
  "plant",
  null,
  null,
] as const;

export const NOTIFICATION = {
  idle: "WELCOME TO CURSOULS!\nCreate an agent to get started",
  joined: "joined",
  left: "left",
} as const;

export const SCENE_DRAG = {
  dragElastic: 0.2,
  dragTransition: {
    bounceStiffness: 300,
    bounceDamping: 20,
  },
} as const;

export const SCENE_SCROLL = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;
