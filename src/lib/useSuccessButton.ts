import { useCallback, useState } from "react";

export function useSuccessButton(ms = 2000) {
  const [succeeded, setSucceeded] = useState(false);
  const triggerSuccess = useCallback(() => {
    setSucceeded(true);
    setTimeout(() => setSucceeded(false), ms);
  }, [ms]);
  return { succeeded, triggerSuccess };
}
