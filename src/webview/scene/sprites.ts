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

const STROKE_WIDTH = 1;
const ORIGIN_TOP_LEFT_X = 0;
const ORIGIN_TOP_LEFT_Y = 0;
const ORIGIN_CENTER = 0.5;

const TABLE_LABEL_OFFSET_X = 8;
const TABLE_LABEL_OFFSET_Y = 6;
const TABLE_SURFACE_OFFSET_X = 8;
const TABLE_SURFACE_OFFSET_BOTTOM = 12;
const TABLE_SURFACE_HORIZONTAL_PADDING = 16;
const TABLE_SURFACE_HEIGHT = 6;

const BUTTON_OUTER_PADDING = 6;
const BUTTON_TOP_OFFSET = 24;
const BUTTON_HEIGHT = 28;

const AVATAR_BADGE_OFFSET_X = 6;
const AVATAR_BADGE_OFFSET_Y = 4;
const AVATAR_BADGE_WIDTH = 26;
const AVATAR_BADGE_HEIGHT = 20;
const AVATAR_BADGE_FILL = 0x7a5d43;
const AVATAR_TEXT_X = 19;
const AVATAR_TEXT_Y = 14;
const AVATAR_PLACEHOLDER = "?";
const AVATAR_TEXT_COLOR = "#161210";

const NAME_TEXT_X = 38;
const BUBBLE_RIGHT_PADDING = 8;
const CONTENT_CENTER_Y = 14;

const BUTTON_NAME_MAX_LENGTH = 14;

const TABLE_LABEL_COLOR = "#b8aa96";
const NAME_TEXT_COLOR = "#f5ecdd";
const FONT_FAMILY = "monospace";
const TABLE_FONT_SIZE = "10px";
const NAME_FONT_SIZE = "10px";
const AVATAR_FONT_SIZE = "10px";
const BUBBLE_FONT_SIZE = "11px";

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
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y);
  const tableStroke = scene.add
    .rectangle(seat.x, seat.y, seat.width, seat.height)
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y)
    .setStrokeStyle(STROKE_WIDTH, DEFAULT_PALETTE.tableStroke);
  const tableLabel = scene.add
    .text(seat.x + TABLE_LABEL_OFFSET_X, seat.y + TABLE_LABEL_OFFSET_Y, seat.label, {
      color: TABLE_LABEL_COLOR,
      fontFamily: FONT_FAMILY,
      fontSize: TABLE_FONT_SIZE,
    })
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y);
  const tableSurface = scene.add
    .rectangle(
      seat.x + TABLE_SURFACE_OFFSET_X,
      seat.y + seat.height - TABLE_SURFACE_OFFSET_BOTTOM,
      seat.width - TABLE_SURFACE_HORIZONTAL_PADDING,
      TABLE_SURFACE_HEIGHT,
      DEFAULT_PALETTE.surfaceFill,
    )
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y);

  const buttonWidth = seat.width - BUTTON_OUTER_PADDING * 2;
  const buttonHeight = BUTTON_HEIGHT;
  const buttonX = seat.x + BUTTON_OUTER_PADDING;
  const buttonY = seat.y + BUTTON_TOP_OFFSET;

  const agentBody = scene.add
    .rectangle(0, 0, buttonWidth, buttonHeight, DEFAULT_PALETTE.buttonFill)
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y);
  agentBody.setStrokeStyle(STROKE_WIDTH, DEFAULT_PALETTE.buttonStroke);

  const avatarBadge = scene.add
    .rectangle(
      AVATAR_BADGE_OFFSET_X,
      AVATAR_BADGE_OFFSET_Y,
      AVATAR_BADGE_WIDTH,
      AVATAR_BADGE_HEIGHT,
      AVATAR_BADGE_FILL,
    )
    .setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_TOP_LEFT_Y);
  const avatarText = scene.add.text(AVATAR_TEXT_X, AVATAR_TEXT_Y, AVATAR_PLACEHOLDER, {
    color: AVATAR_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: AVATAR_FONT_SIZE,
  });
  avatarText.setOrigin(ORIGIN_CENTER, ORIGIN_CENTER);

  const nameText = scene.add.text(NAME_TEXT_X, CONTENT_CENTER_Y, "", {
    color: NAME_TEXT_COLOR,
    fontFamily: FONT_FAMILY,
    fontSize: NAME_FONT_SIZE,
  });
  nameText.setOrigin(ORIGIN_TOP_LEFT_X, ORIGIN_CENTER);

  const bubbleText = scene.add.text(buttonWidth - BUBBLE_RIGHT_PADDING, CONTENT_CENTER_Y, "", {
    color: DEFAULT_PALETTE.accent,
    fontFamily: FONT_FAMILY,
    fontSize: BUBBLE_FONT_SIZE,
  });
  bubbleText.setOrigin(1, ORIGIN_CENTER);

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
  sprite.agentBody.setStrokeStyle(STROKE_WIDTH, palette.buttonStroke);
  sprite.avatarText.setText(initialsFor(seat.agent.name));
  sprite.nameText.setText(trimName(seat.agent.name));
  sprite.bubbleText.setText(statusGlyph(seat.agent.status));
  sprite.bubbleText.setColor(palette.accent);
}

function trimName(value: string, maxLength = BUTTON_NAME_MAX_LENGTH): string {
  return truncate(value.trim(), { length: maxLength, omission: "…" });
}
