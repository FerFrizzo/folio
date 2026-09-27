import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";

// Shared setup for tests that render TanStack Query hooks with renderHook.
// Call once at module level; pass the returned `wrapper` to renderHook.
//
// - React Query batches observer notifications on setTimeout(0), which lands
//   after act() returns; notify synchronously while this file runs so every
//   update stays inside act (restored afterwards).
// - One client per test with gcTime: Infinity so no GC timers are scheduled
//   (they would keep Jest alive after the run); cleared after each test.
export function setupQueryHookTests() {
  let qc: QueryClient;

  beforeAll(() => notifyManager.setScheduler((cb) => cb()));
  afterAll(() => notifyManager.setScheduler((cb) => setTimeout(cb, 0)));

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
  });
  afterEach(() => qc.clear());

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  return { wrapper };
}
