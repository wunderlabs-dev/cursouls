import { useSceneDrag } from "@web/hooks/use-scene-drag";
import type { SceneEnvironmentHandle } from "@web/types";
import { SCENE_DRAG } from "@web/utils/constants";
import { motion } from "framer-motion";
import { forwardRef, type ReactNode, useImperativeHandle } from "react";
import { twMerge } from "tailwind-merge";

interface SceneEnvironmentProps {
  children: ReactNode;
}

const SceneEnvironment = forwardRef<SceneEnvironmentHandle, SceneEnvironmentProps>(
  ({ children }, ref) => {
    const { y, constraintsRef, contentRef, canDrag, scrollTo } = useSceneDrag();

    useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

    return (
      <div ref={constraintsRef} className="flex-1 overflow-hidden">
        <motion.div
          ref={contentRef}
          style={{ y }}
          className={twMerge(
            "flex flex-col gap-4 px-8",
            canDrag ? "cursor-grab active:cursor-grabbing" : undefined,
          )}
          drag={canDrag ? "y" : undefined}
          dragConstraints={constraintsRef}
          {...SCENE_DRAG}
        >
          {children}
        </motion.div>
      </div>
    );
  },
);

export { SceneEnvironment };
