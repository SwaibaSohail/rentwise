import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "LANDLORD" | "TENANT";
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, role: AppUser["role"]) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const { data } = await api.get("/api/auth/me");
          setUser(data);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signup(email: string, password: string, name: string, role: AppUser["role"]) {
    await createUserWithEmailAndPassword(auth, email, password);
    const { data } = await api.post("/api/auth/register", { name, role });
    setUser(data);
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    const { data } = await api.get("/api/auth/me");
    setUser(data);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
