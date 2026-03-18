import { useCallback, useState } from "react";

const COUNTER_STEP = 1;
const COUNTER_START = 0;

export const useCounter = (initialValue = COUNTER_START, step = COUNTER_STEP) => {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((value) => value + step);
  }, [step]);

  const decrement = useCallback(() => {
    setCount((value) => value - step);
  }, [step]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return {
    count,
    increment,
    decrement,
    reset,
  };
};
