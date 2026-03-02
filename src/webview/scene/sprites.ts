import Phaser from "phaser";
import truncate from "lodash.truncate";
import type { AgentStatus } from "@shared/types";
import { initialsFor, statusGlyph } from "@web/present";
import type { SeatRenderModel } from "./model";

interface SeatPalette {
  tableFill: number;
  tableStroke: number;
  surfaceFill: number;
  buttonFill: number;
  buttonStroke: number;
  accent: string;
}

const DEFAULT_PALETTE: SeatPalette = {
  tableFill: 0x31271f,
  tableStroke: 0x4a3a2f,
  surfaceFill: 0x4d3b2f,
  buttonFill: 0x251d17,
  buttonStroke: 0x5b4739,
  accent: "#efb35a",
};

const STATUS_PALETTE: Record<AgentStatus, Partial<SeatPalette>> = {
  running: { buttonStroke: 0x6f7f4a, accent: "#b7df6f" },
  idle: { buttonStroke: 0x5b4739, accent: "#efb35a" },
  completed: { buttonStroke: 0x4c8f5f, accent: "#77d68d" },
  error: { buttonStroke: 0x8f4c4c, accent: "#f06d5e" },
};

export interface SeatSprite {
  table: Phaser.GameObjects.Rectangle;
  tableStroke: Phaser.GameObjects.Rectangle;
  tableSurface: Phaser.GameObjects.Rectangle;
  tableLabel: Phaser.GameObjects.Text;
  agentButton: Phaser.GameObjects.Container;
  agentBody: Phaser.GameObjects.Rectangle;
  avatarBadge: Phaser.GameObjects.Rectangle;
  avatarText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  bubbleText: Phaser.GameObjects.Text;
}

export function createSeatSprite(
  scene: Phaser.Scene,
  seat: SeatRenderModel,
  onSeatClick: (agentId: string) => void,
): SeatSprite {
  const table = scene.add
    .rectangle(seat.x, seat.y, seat.width, seat.height, DEFAULT_PALETTE.tableFill)
    .setOrigin(0, 0);
  const tableStroke = scene.add
    .rectangle(seat.x, seat.y, seat.width, seat.height)
    .setOrigin(0, 0)
    .setStrokeStyle(1, DEFAULT_PALETTE.tableStroke);
  const tableLabel = scene.add
    .text(seat.x + 8, seat.y + 6, seat.label, {
      color: "#b8aa96",
      fontFamily: "monospace",
      fontSize: "10px",
    })
    .setOrigin(0, 0);
  const tableSurface = scene.add
    .rectangle(
      seat.x + 8,
      seat.y + seat.height - 12,
      seat.width - 16,
      6,
      DEFAULT_PALETTE.surfaceFill,
    )
    .setOrigin(0, 0);

  const buttonWidth = seat.width - 12;
  const buttonHeight = 28;
  const buttonX = seat.x + 6;
  const buttonY = seat.y + 24;

  const agentBody = scene.add
    .rectangle(0, 0, buttonWidth, buttonHeight, DEFAULT_PALETTE.buttonFill)
    .setOrigin(0, 0);
  agentBody.setStrokeStyle(1, DEFAULT_PALETTE.buttonStroke);

  const avatarBadge = scene.add.rectangle(6, 4, 26, 20, 0x7a5d43).setOrigin(0, 0);
  const avatarText = scene.add.text(19, 14, "?", {
    color: "#161210",
    fontFamily: "monospace",
    fontSize: "10px",
  });
  avatarText.setOrigin(0.5, 0.5);

  const nameText = scene.add.text(38, 14, "", {
    color: "#f5ecdd",
    fontFamily: "monospace",
    fontSize: "10px",
  });
  nameText.setOrigin(0, 0.5);

  const bubbleText = scene.add.text(buttonWidth - 8, 14, "", {
    color: DEFAULT_PALETTE.accent,
    fontFamily: "monospace",
    fontSize: "11px",
  });
  bubbleText.setOrigin(1, 0.5);

  const agentButton = scene.add.container(buttonX, buttonY, [
    agentBody,
    avatarBadge,
    avatarText,
    nameText,
    bubbleText,
  ]);

  agentButton.setSize(buttonWidth, buttonHeight);
  agentButton.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
    Phaser.Geom.Rectangle.Contains,
  );
  agentButton.on("pointerup", () => {
    const agentId = agentButton.getData("agentId");
    if (typeof agentId === "string" && agentId.length > 0) {
      onSeatClick(agentId);
    }
  });

  return {
    table,
    tableStroke,
    tableSurface,
    tableLabel,
    agentButton,
    agentBody,
    avatarBadge,
    avatarText,
    nameText,
    bubbleText,
  };
}

export function updateSeatSprite(sprite: SeatSprite, seat: SeatRenderModel): void {
  if (!seat.agent) {
    if (sprite.agentButton.input) {
      sprite.agentButton.input.enabled = false;
    }
    sprite.agentButton.setData("agentId", null);
    sprite.agentButton.setVisible(false);
    return;
  }

  const statusPalette = STATUS_PALETTE[seat.agent.status];
  const palette: SeatPalette = {
    ...DEFAULT_PALETTE,
    ...statusPalette,
  };

  sprite.agentButton.setVisible(true);
  sprite.agentButton.setData("agentId", seat.agent.id);
  if (sprite.agentButton.input) {
    sprite.agentButton.input.enabled = true;
  }
  sprite.agentBody.setStrokeStyle(1, palette.buttonStroke);
  sprite.avatarText.setText(initialsFor(seat.agent.name));
  sprite.nameText.setText(trimName(seat.agent.name));
  sprite.bubbleText.setText(statusGlyph(seat.agent.status));
  sprite.bubbleText.setColor(palette.accent);
}

function trimName(value: string, maxLength = 14): string {
  return truncate(value.trim(), { length: maxLength, omission: "…" });
}
