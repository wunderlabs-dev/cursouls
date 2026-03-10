import type { SceneFrame } from "@shared/types";
import { UNKNOWN_SOURCE_LABEL, WARNING_LABEL_PLURAL, WARNING_LABEL_SINGULAR } from "@web/constants";
import { cn } from "@web/utils/helpers";

interface HealthBannerProps {
  frame?: SceneFrame;
  fallbackLabel: string;
}

export function HealthBanner({ frame, fallbackLabel }: HealthBannerProps) {
  const label = frame ? buildHealthLabel(frame) : fallbackLabel;
  return (
    <header
      role="status"
      className={cn(
        "rounded-lg border px-2 py-1 text-[11px] text-[#b8aa96]",
        "border-[#3d3229] bg-[#2a221d]",
        frame && !frame.health.sourceConnected && "border-[#f06d5e] text-[#f06d5e]",
      )}
    >
      {label}
    </header>
  );
}

function buildHealthLabel(frame: SceneFrame): string {
  const source = frame.health.sourceLabel || UNKNOWN_SOURCE_LABEL;
  const warnings = frame.health.warnings.length;
  if (warnings === 0) {
    return source;
  }
  const label = warnings === 1 ? WARNING_LABEL_SINGULAR : WARNING_LABEL_PLURAL;
  return `${source} (${warnings} ${label})`;
}
