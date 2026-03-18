import { type ReactNode, forwardRef, useImperativeHandle } from "react";
import { twMerge } from "tailwind-merge";

import { useSceneDrag } from "../hooks/use-scene-drag";

import type { SceneEnvironmentHandle } from "../types";

interface SceneEnvironmentProps {
  children: ReactNode;
}

const SceneEnvironment = forwardRef<SceneEnvironmentHandle, SceneEnvironmentProps>(
  ({ children }, ref) => {
    const { constraintsRef, contentRef, canDrag, scrollTo } = useSceneDrag();

    useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

    return (
      <div ref={constraintsRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          ref={contentRef}
          className={twMerge(
            "flex flex-col gap-4 px-8",
            canDrag ? "cursor-grab active:cursor-grabbing" : undefined,
          )}
        >
          {children}
        </div>
      </div>
    );
  },
);

export default SceneEnvironment;
