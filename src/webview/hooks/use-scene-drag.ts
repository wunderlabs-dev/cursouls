import { SCENE_SCROLL } from "@web/utils/constants";
import { animate, useMotionValue } from "framer-motion";
import { clamp, isNil } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SCROLL_Y = 0;
const CENTER_DIVISOR = 2;

export const useSceneDrag = () => {
  const y = useMotionValue(MAX_SCROLL_Y);
  const [canDrag, setCanDrag] = useState<boolean | undefined>();

  const contentRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    const container = constraintsRef.current;

    if (isNil(content) || isNil(container)) {
      return;
    }

    // enable drag only when
    // content overflows the container
    const observer = new ResizeObserver(() => {
      setCanDrag(content.scrollHeight > container.clientHeight);
    });

    observer.observe(container);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback(
    (element: HTMLElement) => {
      const content = contentRef.current;
      const container = constraintsRef.current;

      if (isNil(content) || isNil(container)) {
        return;
      }

      // skip scroll when content
      // fits within the container
      if (content.scrollHeight <= container.clientHeight) {
        return;
      }

      const currentY = y.get();
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const naturalOffset = elementRect.top - containerRect.top - currentY;
      const targetY = (containerRect.height - elementRect.height) / CENTER_DIVISOR - naturalOffset;
      const minY = -(content.scrollHeight - containerRect.height);
      const clampedY = clamp(targetY, minY, MAX_SCROLL_Y);

      // animate scroll to center
      // a given element within the visible container
      animate(y, clampedY, SCENE_SCROLL);
    },
    [y],
  );

  return {
    y,
    constraintsRef,
    contentRef,
    canDrag,
    scrollTo,
  };
};
