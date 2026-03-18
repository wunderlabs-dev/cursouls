import { useRef, useState, useEffect, useCallback } from "react";
import { isNil } from "lodash";

const CENTER_DIVISOR = 2;

export const useSceneDrag = () => {
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

      const targetTop =
        element.offsetTop - container.clientHeight / CENTER_DIVISOR + element.clientHeight / CENTER_DIVISOR;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    },
    [],
  );

  return {
    constraintsRef,
    contentRef,
    canDrag,
    scrollTo,
  };
};
