import { useCallback, useEffect, useRef, useState } from "react";

export function useSuccessButton(ms = 2000) {
  const [succeeded, setSucceeded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const triggerSuccess = useCallback(() => {
    setSucceeded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSucceeded(false), ms);
  }, [ms]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { succeeded, triggerSuccess };
}
