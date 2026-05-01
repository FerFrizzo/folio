import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/src/lib/firebase";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "unconfigured"; user: null }
  | { status: "error"; user: null; error: Error }
  | { status: "ready"; user: User };

const AuthContext = createContext<AuthState>({ status: "loading", user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  const signInAttempted = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({ status: "unconfigured", user: null });
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setState({ status: "ready", user });
          return;
        }
        if (signInAttempted.current) return;
        signInAttempted.current = true;
        signInAnonymously(auth).catch((error: unknown) => {
          setState({
            status: "error",
            user: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        });
      },
      (error) => {
        setState({ status: "error", user: null, error });
      },
    );
    return unsub;
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
