import { useEffect, useState, useRef } from "react";

export function useCountdown(timeLimitMs: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(timeLimitMs);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - (startRef.current || 0);
      const diff = timeLimitMs - elapsed;

      if (diff <= 0) {
        setRemaining(0);
        clearInterval(interval);
        onExpire();
      } else {
        setRemaining(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimitMs]);

  return {
    remaining,
    minutes: Math.floor(remaining / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
    isExpired: remaining <= 0,
  };
}
