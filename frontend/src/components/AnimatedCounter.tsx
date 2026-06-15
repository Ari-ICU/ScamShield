"use client";

import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export default function AnimatedCounter({ value, duration = 1000 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    // Cap updates to safe frame refresh intervals
    const incrementTime = Math.max(Math.floor(totalMiliseconds / Math.max(end, 1)), 15);

    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}
