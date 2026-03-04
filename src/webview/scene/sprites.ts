import Phaser from "phaser";
import truncate from "lodash.truncate";
import type { AgentStatus } from "@shared/types";
import { initialsFor, statusGlyph } from "@web/present";
import type { SeatRenderModel } from "./model";

interface SeatPalette {
  buttonFill: number;
  buttonStroke: number;
  accent: string;
}

const DEFAULT_PALETTE: SeatPalette = {
  buttonFill: 0x221d1a,
  buttonStroke: 0x6e5f53,
  accent: "#f1d4a8",
};

const STATUS_PALETTE: Record<AgentStatus, Partial<SeatPalette>> = {
  running: { buttonStroke: 0x7aa06d, accent: "#c8f2b8" },
  idle: { buttonStroke: 0x6e5f53, accent: "#f1d4a8" },
  completed: { buttonStroke: 0x4c8f5f, accent: "#88e3aa" },
  error: { buttonStroke: 0x8f4c4c, accent: "#f06d5e" },
};

const STROKE_WIDTH = 1;
const ORIGIN_TOP_LEFT_X = 0;
const ORIGIN_TOP_LEFT_Y = 0;
const ORIGIN_CENTER = 0.5;

const BUTTON_OUTER_PADDING = 10;
const BUTTON_TOP_OFFSET = 32;
const BUTTON_HEIGHT = 28;
const BUTTON_MIN_ALPHA = 0.84;

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

const NAME_TEXT_COLOR = "#f5ecdd";
const FONT_FAMILY = "monospace";
const NAME_FONT_SIZE = "10px";
const AVATAR_FONT_SIZE = "10px";
const BUBBLE_FONT_SIZE = "11px";
const ACTOR_OFFSET_X = 14;
const ACTOR_OFFSET_Y = 24;
const ACTOR_BODY_IDLE = 0x5c7b96;
const ACTOR_BODY_RUNNING = 0x6a9f6a;
const ACTOR_BODY_COMPLETED = 0x4c8f5f;
const ACTOR_BODY_ERROR = 0x8f4c4c;
const ACTOR_HEAD_COLOR = 0xf0c9a1;
const ACTOR_LAPTOP_COLOR = 0x2e3a44;
const ACTOR_TEXTURE_PREFIX = "cafe-actor";
const ACTOR_FRAME_IDLE_A = `${ACTOR_TEXTURE_PREFIX}-idle-a`;
const ACTOR_FRAME_IDLE_B = `${ACTOR_TEXTURE_PREFIX}-idle-b`;
const ACTOR_FRAME_RUNNING_A = `${ACTOR_TEXTURE_PREFIX}-run-a`;
const ACTOR_FRAME_RUNNING_B = `${ACTOR_TEXTURE_PREFIX}-run-b`;
const ACTOR_FRAME_COMPLETED = `${ACTOR_TEXTURE_PREFIX}-done`;
const ACTOR_FRAME_ERROR = `${ACTOR_TEXTURE_PREFIX}-error`;

export interface SeatSprite {
  floorShadow: Phaser.GameObjects.Ellipse;
  agentActor: Phaser.GameObjects.Sprite;
  actorLaptop: Phaser.GameObjects.Rectangle;
  actorSteam: Phaser.GameObjects.Ellipse;
  actorBaseY: number;
  actorTween: Phaser.Tweens.Tween | null;
  actorFrameEvent: Phaser.Time.TimerEvent | null;
  actorSteamTween: Phaser.Tweens.Tween | null;
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
  ensureActorTextures(scene);
  const floorShadow = scene.add
    .ellipse(
      seat.x + seat.width * 0.5,
      seat.y + seat.height - 16,
      seat.width * 0.62,
      18,
      0x000000,
      0.22,
    )
    .setOrigin(ORIGIN_CENTER, ORIGIN_CENTER);

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

  const actorBaseY = seat.y + ACTOR_OFFSET_Y;
  const agentActor = scene.add
    .sprite(seat.x + seat.width * 0.5 + ACTOR_OFFSET_X, actorBaseY, ACTOR_FRAME_IDLE_A)
    .setOrigin(0.5, 0.5)
    .setDepth(6);
  const actorLaptop = scene.add
    .rectangle(
      seat.x + seat.width * 0.5 + ACTOR_OFFSET_X + 9,
      actorBaseY + 7,
      14,
      8,
      ACTOR_LAPTOP_COLOR,
    )
    .setOrigin(0.5, 0.5)
    .setDepth(5);
  const actorSteam = scene.add
    .ellipse(
      seat.x + seat.width * 0.5 + ACTOR_OFFSET_X + 14,
      actorBaseY - 5,
      6,
      8,
      0xffffff,
      0.36,
    )
    .setOrigin(0.5, 0.5)
    .setDepth(5);
  actorSteam.setVisible(false);

  return {
    floorShadow,
    agentActor,
    actorLaptop,
    actorSteam,
    actorBaseY,
    actorTween: null,
    actorFrameEvent: null,
    actorSteamTween: null,
    agentButton,
    agentBody,
    avatarBadge,
    avatarText,
    nameText,
    bubbleText,
  };
}

export function updateSeatSprite(sprite: SeatSprite, seat: SeatRenderModel): void {
  sprite.actorBaseY = seat.y + ACTOR_OFFSET_Y;
  sprite.agentActor.setPosition(seat.x + seat.width * 0.5 + ACTOR_OFFSET_X, sprite.actorBaseY);
  sprite.actorLaptop.setPosition(seat.x + seat.width * 0.5 + ACTOR_OFFSET_X + 9, sprite.actorBaseY + 7);
  sprite.actorSteam.setPosition(seat.x + seat.width * 0.5 + ACTOR_OFFSET_X + 14, sprite.actorBaseY - 5);
  sprite.agentButton.setPosition(seat.x + BUTTON_OUTER_PADDING, seat.y + BUTTON_TOP_OFFSET);

  if (!seat.agent) {
    stopActorEffects(sprite);
    if (sprite.agentButton.input) {
      sprite.agentButton.input.enabled = false;
    }
    sprite.agentActor.setVisible(false);
    sprite.actorLaptop.setVisible(false);
    sprite.actorSteam.setVisible(false);
    sprite.agentButton.setData("agentId", null);
    sprite.agentButton.setVisible(false);
    return;
  }

  const statusPalette = STATUS_PALETTE[seat.agent.status];
  const palette: SeatPalette = {
    ...DEFAULT_PALETTE,
    ...statusPalette,
  };

  sprite.agentActor.setVisible(true);
  sprite.actorLaptop.setVisible(true);
  sprite.agentButton.setVisible(true);
  sprite.agentButton.setData("agentId", seat.agent.id);
  if (sprite.agentButton.input) {
    sprite.agentButton.input.enabled = true;
  }
  sprite.agentButton.setAlpha(BUTTON_MIN_ALPHA);
  sprite.agentBody.setStrokeStyle(STROKE_WIDTH, palette.buttonStroke);
  sprite.avatarText.setText(initialsFor(seat.agent.name));
  sprite.nameText.setText(trimName(seat.agent.name));
  sprite.bubbleText.setText(statusGlyph(seat.agent.status));
  sprite.bubbleText.setColor(palette.accent);
  applyActorStatus(sprite, seat.agent.status);
}

function trimName(value: string, maxLength = BUTTON_NAME_MAX_LENGTH): string {
  return truncate(value.trim(), { length: maxLength, omission: "…" });
}

function applyActorStatus(sprite: SeatSprite, status: AgentStatus): void {
  const currentStatus = sprite.agentActor.getData("status") as AgentStatus | undefined;
  if (currentStatus === status) {
    return;
  }
  stopActorEffects(sprite);
  sprite.agentActor.setData("status", status);
  sprite.agentActor.clearTint();
  sprite.agentActor.setScale(1);
  sprite.agentActor.setY(sprite.actorBaseY);
  sprite.actorSteam.setVisible(false);
  if (status === "running") {
    sprite.agentActor.setTexture(ACTOR_FRAME_RUNNING_A);
    sprite.agentActor.setTint(ACTOR_BODY_RUNNING);
    let toggle = false;
    sprite.actorFrameEvent = sprite.agentActor.scene.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        toggle = !toggle;
        sprite.agentActor.setTexture(toggle ? ACTOR_FRAME_RUNNING_A : ACTOR_FRAME_RUNNING_B);
      },
    });
    sprite.actorTween = sprite.agentActor.scene.tweens.add({
      targets: sprite.agentActor,
      y: sprite.actorBaseY - 2,
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: "Sine.easeInOut",
    });
    sprite.actorSteam.setVisible(true);
    sprite.actorSteamTween = sprite.agentActor.scene.tweens.add({
      targets: sprite.actorSteam,
      y: sprite.actorSteam.y - 3,
      alpha: 0.1,
      yoyo: true,
      repeat: -1,
      duration: 520,
      ease: "Sine.easeInOut",
    });
    return;
  }
  if (status === "completed") {
    sprite.agentActor.setTexture(ACTOR_FRAME_COMPLETED);
    sprite.agentActor.setTint(ACTOR_BODY_COMPLETED);
    sprite.actorTween = sprite.agentActor.scene.tweens.add({
      targets: sprite.agentActor,
      scaleX: 1.08,
      scaleY: 1.08,
      yoyo: true,
      repeat: -1,
      duration: 760,
      ease: "Quad.easeInOut",
    });
    return;
  }
  if (status === "error") {
    sprite.agentActor.setTexture(ACTOR_FRAME_ERROR);
    sprite.agentActor.setTint(ACTOR_BODY_ERROR);
    sprite.actorTween = sprite.agentActor.scene.tweens.add({
      targets: sprite.agentActor,
      x: sprite.agentActor.x + 1.5,
      yoyo: true,
      repeat: -1,
      duration: 90,
      ease: "Linear",
    });
    return;
  }
  sprite.agentActor.setTexture(ACTOR_FRAME_IDLE_A);
  sprite.agentActor.setTint(ACTOR_BODY_IDLE);
  let toggle = false;
  sprite.actorFrameEvent = sprite.agentActor.scene.time.addEvent({
    delay: 1100,
    loop: true,
    callback: () => {
      toggle = !toggle;
      sprite.agentActor.setTexture(toggle ? ACTOR_FRAME_IDLE_A : ACTOR_FRAME_IDLE_B);
    },
  });
}

function stopActorEffects(sprite: SeatSprite): void {
  sprite.actorTween?.stop();
  sprite.actorTween = null;
  sprite.actorFrameEvent?.remove(false);
  sprite.actorFrameEvent = null;
  sprite.actorSteamTween?.stop();
  sprite.actorSteamTween = null;
  sprite.agentActor.setScale(1);
  sprite.agentActor.setY(sprite.actorBaseY);
  sprite.actorSteam.setY(sprite.actorBaseY - 5);
  sprite.actorSteam.setAlpha(0.36);
}

export function ensureActorTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(ACTOR_FRAME_IDLE_A)) {
    return;
  }
  const graphics = scene.add.graphics();
  drawActorTexture(graphics, ACTOR_FRAME_IDLE_A, { armOffset: 0, eyeClosed: false, browDown: false });
  drawActorTexture(graphics, ACTOR_FRAME_IDLE_B, { armOffset: 1, eyeClosed: false, browDown: false });
  drawActorTexture(graphics, ACTOR_FRAME_RUNNING_A, { armOffset: 1, eyeClosed: false, browDown: false });
  drawActorTexture(graphics, ACTOR_FRAME_RUNNING_B, { armOffset: -1, eyeClosed: false, browDown: false });
  drawActorTexture(graphics, ACTOR_FRAME_COMPLETED, {
    armOffset: 0,
    eyeClosed: false,
    browDown: false,
    smile: true,
  });
  drawActorTexture(graphics, ACTOR_FRAME_ERROR, { armOffset: 0, eyeClosed: true, browDown: true });
  graphics.destroy();
}

function drawActorTexture(
  graphics: Phaser.GameObjects.Graphics,
  textureKey: string,
  options: { armOffset: number; eyeClosed: boolean; browDown: boolean; smile?: boolean },
): void {
  const width = 16;
  const height = 20;
  graphics.clear();
  graphics.fillStyle(0x000000, 0);
  graphics.fillRect(0, 0, width, height);
  graphics.fillStyle(ACTOR_BODY_IDLE, 1);
  graphics.fillRect(4, 9, 8, 8);
  graphics.fillStyle(ACTOR_HEAD_COLOR, 1);
  graphics.fillRect(3, 2, 10, 8);
  graphics.fillStyle(0x1a1411, 1);
  if (options.eyeClosed) {
    graphics.fillRect(6, 5, 2, 1);
    graphics.fillRect(9, 5, 2, 1);
  } else {
    graphics.fillRect(6, 5, 1, 1);
    graphics.fillRect(10, 5, 1, 1);
  }
  if (options.browDown) {
    graphics.fillRect(5, 4, 3, 1);
    graphics.fillRect(9, 4, 3, 1);
  }
  if (options.smile) {
    graphics.fillRect(7, 8, 3, 1);
  }
  graphics.fillStyle(0x3a2f28, 1);
  graphics.fillRect(2 + options.armOffset, 10, 2, 4);
  graphics.fillRect(12 + options.armOffset, 10, 2, 4);
  graphics.generateTexture(textureKey, width, height);
}
