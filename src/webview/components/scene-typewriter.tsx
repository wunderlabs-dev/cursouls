import { useEffect, useState } from "react";

const TYPEWRITER_DEFAULT_INDEX = 1;
const TYPEWRITER_DEFAULT_START_CHAR_INDEX = 0;
const TYPEWRITER_DEFAULT_SPEED = 50;

interface TypewriterProps {
  text: string;
  speed?: number;
}

const Typewriter = ({ text, speed = TYPEWRITER_DEFAULT_SPEED }: TypewriterProps) => {
  const [index, setIndex] = useState(TYPEWRITER_DEFAULT_INDEX);

  useEffect(() => {
    if (index >= text.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setIndex((prev) => prev + TYPEWRITER_DEFAULT_INDEX);
    }, speed);

    return () => clearTimeout(timeout);
  }, [index, text, speed]);

  return <span>{text.slice(TYPEWRITER_DEFAULT_START_CHAR_INDEX, index)}</span>;
};

export { Typewriter };
