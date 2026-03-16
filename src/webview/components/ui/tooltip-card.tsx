import type { TooltipData } from "@web/bridge/types";
import {
  TOOLTIP_ELAPSED_LABEL,
  TOOLTIP_STATUS_LABEL,
  TOOLTIP_TASK_LABEL,
  TOOLTIP_UPDATED_LABEL,
  TOOLTIP_VALUE_MAX_LENGTH,
} from "@web/constants";
import { cn } from "@web/utils/helpers";
import truncate from "lodash.truncate";
import type { JSX } from "react";

interface TooltipCardProps {
  tooltip?: TooltipData;
}

export function TooltipCard({ tooltip }: TooltipCardProps): JSX.Element {
  return (
    <aside
      className={cn("rounded-lg border border-[#3d3229] bg-[#16120ef9] p-2", !tooltip && "hidden")}
      aria-live="polite"
    >
      {tooltip ? (
        <div>
          <div className="mb-1.5 text-[#efb35a]">{tooltip.name}</div>
          <TooltipLine label={TOOLTIP_STATUS_LABEL} value={tooltip.status} />
          <TooltipLine label={TOOLTIP_TASK_LABEL} value={tooltip.task} />
          <TooltipLine label={TOOLTIP_ELAPSED_LABEL} value={tooltip.elapsed} />
          <TooltipLine label={TOOLTIP_UPDATED_LABEL} value={tooltip.updated} />
        </div>
      ) : null}
    </aside>
  );
}

interface TooltipLineProps {
  label: string;
  value: string;
}

function TooltipLine({ label, value }: TooltipLineProps): JSX.Element {
  return (
    <div className="mb-1 flex items-center justify-between text-[11px]">
      <span className="text-[#b8aa96]">{label}</span>
      <strong className="max-w-[64%] overflow-hidden text-ellipsis whitespace-nowrap text-[#f5ecdd]">
        {truncate(value, { length: TOOLTIP_VALUE_MAX_LENGTH })}
      </strong>
    </div>
  );
}
