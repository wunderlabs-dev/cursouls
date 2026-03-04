from __future__ import annotations

from pathlib import Path
import sys
from typing import Literal, TypedDict

from PIL import Image, ImageDraw

ROOM_BUILDER_COLUMNS = 17
INTERIORS_COLUMNS = 16
TILE = 32
WALL_ROWS = 3
MIN_FLOOR_OPACITY = 0.95
MAX_FLOOR_EDGE_SCORE = 28.0

ROOM_LAYOUT = [
    "WWWWWWWWWW",
    "WwWwWwWwWW",
    "CCCCCCCCCC",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
    "FFFdFFFFdF",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
    "FFFdFFFFdF",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
    "FFFFFFFFFF",
]


TextureKey = Literal["room_builder", "interiors"]


class LayoutVariant(TypedDict):
    name: str
    wall: list[int]
    floor: list[int]
    floor_texture: TextureKey


def rb(col: int, row: int) -> int:
    return row * ROOM_BUILDER_COLUMNS + col


def it(col: int, row: int) -> int:
    return row * INTERIORS_COLUMNS + col


VARIANTS: list[LayoutVariant] = [
    {
        "name": "roombuilder_floor",
        "wall": [rb(1, 15), rb(2, 15), rb(3, 15), rb(4, 15)],
        "floor": [rb(11, 5), rb(12, 5), rb(13, 5), rb(11, 6), rb(12, 6), rb(13, 6)],
        "floor_texture": "room_builder",
    },
    {
        "name": "interiors_floor_a",
        "wall": [rb(1, 15), rb(2, 15), rb(3, 15), rb(4, 15)],
        "floor": [it(0, 32), it(1, 32), it(2, 32), it(4, 32), it(5, 32)],
        "floor_texture": "interiors",
    },
    {
        "name": "interiors_floor_b",
        "wall": [rb(1, 15), rb(2, 15), rb(3, 15), rb(4, 15)],
        "floor": [it(0, 11), it(1, 11), it(2, 11), it(4, 11), it(5, 11)],
        "floor_texture": "interiors",
    },
]

CURRENT_MAPPING: LayoutVariant = {
    "name": "current_mapping",
    "wall": [rb(1, 15), rb(2, 15), rb(3, 15), rb(4, 15)],
    "floor": [it(0, 33), it(1, 33)],
    "floor_texture": "interiors",
}

COUNTER = [it(10, 70), it(11, 70), it(12, 70), it(13, 70)]
WINDOW = [it(6, 67), it(7, 67), it(8, 67), it(9, 67)]
DECOR = [it(0, 53), it(6, 58)]


def draw_variant(
    room_builder: Image.Image,
    interiors: Image.Image,
    variant: LayoutVariant,
) -> Image.Image:
    cols = len(ROOM_LAYOUT[0])
    rows = len(ROOM_LAYOUT)
    canvas = Image.new("RGBA", (cols * TILE, rows * TILE), (28, 21, 17, 255))
    draw = ImageDraw.Draw(canvas)
    for row, pattern in enumerate(ROOM_LAYOUT):
        for col, symbol in enumerate(pattern):
            x = col * TILE
            y = row * TILE
            if symbol in {"W", "w", "C"} or row < WALL_ROWS:
                wall = variant["wall"][(row + col) % len(variant["wall"])]
                sprite = crop_frame(room_builder, wall, ROOM_BUILDER_COLUMNS)
            else:
                floor = variant["floor"][(row + col) % len(variant["floor"])]
                if variant["floor_texture"] == "interiors":
                    sprite = crop_frame(interiors, floor, INTERIORS_COLUMNS)
                else:
                    sprite = crop_frame(room_builder, floor, ROOM_BUILDER_COLUMNS)
            canvas.alpha_composite(sprite, (x, y))

            if symbol == "w":
                frame = WINDOW[(col // 2) % len(WINDOW)]
                canvas.alpha_composite(crop_frame(interiors, frame, INTERIORS_COLUMNS), (x, y))
            elif symbol == "C":
                frame = COUNTER[col % len(COUNTER)]
                canvas.alpha_composite(crop_frame(interiors, frame, INTERIORS_COLUMNS), (x, y))
            elif symbol == "d":
                frame = DECOR[(row + col) % len(DECOR)]
                canvas.alpha_composite(crop_frame(interiors, frame, INTERIORS_COLUMNS), (x, y))

    draw.text((6, 6), variant["name"], fill=(255, 220, 170, 255))
    return canvas


def crop_frame(image: Image.Image, index: int, columns: int) -> Image.Image:
    row = index // columns
    col = index % columns
    return image.crop((col * TILE, row * TILE, col * TILE + TILE, row * TILE + TILE))


def opacity_ratio(tile: Image.Image) -> float:
    alpha = tile.getchannel("A")
    pixels = alpha.getdata()
    opaque_count = sum(1 for value in pixels if value >= 20)
    return opaque_count / (TILE * TILE)


def edge_score(tile: Image.Image) -> float:
    pixels = tile.load()
    total = 0
    for offset in range(TILE):
        top = pixels[offset, 0]
        bottom = pixels[offset, TILE - 1]
        left = pixels[0, offset]
        right = pixels[TILE - 1, offset]
        total += abs(top[0] - bottom[0]) + abs(top[1] - bottom[1]) + abs(top[2] - bottom[2])
        total += abs(left[0] - right[0]) + abs(left[1] - right[1]) + abs(left[2] - right[2])
    return total / (TILE * 6)


def atlas_columns(texture_key: TextureKey) -> int:
    if texture_key == "interiors":
        return INTERIORS_COLUMNS
    return ROOM_BUILDER_COLUMNS


def validate_variant(
    room_builder: Image.Image,
    interiors: Image.Image,
    variant: LayoutVariant,
) -> list[str]:
    errors: list[str] = []
    floor_columns = atlas_columns(variant["floor_texture"])
    floor_rows = (interiors.height // TILE) if variant["floor_texture"] == "interiors" else (room_builder.height // TILE)
    floor_max = floor_columns * floor_rows
    for frame in variant["floor"]:
        if frame < 0 or frame >= floor_max:
            errors.append(
                f"{variant['name']}: floor frame {frame} outside {variant['floor_texture']} bounds (max={floor_max - 1})"
            )

    source = interiors if variant["floor_texture"] == "interiors" else room_builder
    for frame in variant["floor"]:
        tile = crop_frame(source, frame, floor_columns)
        ratio = opacity_ratio(tile)
        if ratio < MIN_FLOOR_OPACITY:
            errors.append(
                f"{variant['name']}: floor frame {frame} opacity {ratio:.3f} < {MIN_FLOOR_OPACITY:.2f}"
            )
        score = edge_score(tile)
        if score > MAX_FLOOR_EDGE_SCORE:
            errors.append(
                f"{variant['name']}: floor frame {frame} edge-score {score:.1f} > {MAX_FLOOR_EDGE_SCORE:.1f}"
            )
    return errors


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    room_builder = Image.open(repo / "src/webview/assets/room_builder_free_32x32.png").convert("RGBA")
    interiors = Image.open(repo / "src/webview/assets/interiors_free_32x32.png").convert("RGBA")
    variants = [draw_variant(room_builder, interiors, variant) for variant in VARIANTS]
    spacing = 16
    width = sum(v.width for v in variants) + spacing * (len(variants) + 1)
    height = max(v.height for v in variants) + 40
    out = Image.new("RGBA", (width, height), (15, 12, 10, 255))
    x = spacing
    for preview in variants:
        out.alpha_composite(preview, (x, 24))
        x += preview.width + spacing
    out_path = repo / ".tmp_layout_variants.png"
    out.save(out_path)
    print(out_path)

    validation_errors = validate_variant(room_builder, interiors, CURRENT_MAPPING)
    if validation_errors:
        print("Current mapping validation failed:", file=sys.stderr)
        for error in validation_errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)

    current_mapping = draw_variant(room_builder, interiors, CURRENT_MAPPING)
    current_path = repo / ".tmp_layout_current_mapping.png"
    current_mapping.save(current_path)
    print(current_path)


if __name__ == "__main__":
    main()
