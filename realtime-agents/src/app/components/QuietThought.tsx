import { useState, useEffect } from "react";

interface QuietThoughtProps {
  isActive: boolean;
}

const thoughts = [
  "just breathe",
  "what's true right now?",
  "let it out",
  "you know the answer",
  "say it",
];

export const QuietThought = ({ isActive }: QuietThoughtProps) => {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (isActive) return;

    const timer = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % thoughts.length);
        setShow(true);
      }, 400);
    }, 4000);

    return () => clearInterval(timer);
  }, [isActive]);

  return (
    <p
      className={`handwritten text-xl text-foreground/50 h-8 transition-opacity duration-400 ${
        show ? "opacity-100" : "opacity-0"
      } ${isActive ? "italic" : ""}`}
    >
      {isActive ? "..." : thoughts[index]}
    </p>
  );
};
