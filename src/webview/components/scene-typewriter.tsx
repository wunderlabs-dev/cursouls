import { useState, useEffect } from "react";

const DEFAULT_INDEX = 1;
const DEFAULT_START_CHAR_INDEX = 0;
const DEFAULT_SPEED = 50;

interface TypewriterProps {
  text: string;
  speed?: number;
}

const Typewriter = ({ text, speed = DEFAULT_SPEED }: TypewriterProps) => {
  const [index, setIndex] = useState(DEFAULT_INDEX);

  useEffect(() => {
    if (index >= text.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setIndex((prev) => prev + DEFAULT_INDEX);
    }, speed);

    return () => clearTimeout(timeout);
  }, [index, text, speed]);

  return <span>{text.slice(DEFAULT_START_CHAR_INDEX, index)}</span>;
};

export default Typewriter;
