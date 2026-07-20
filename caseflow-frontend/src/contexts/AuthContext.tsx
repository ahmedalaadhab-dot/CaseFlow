import * as React from "react";
import { api, setAccessToken, getRefreshToken, setRefreshToken, unwrap } from "@/lib/api-client";
import type { User } from "@/lib/types";

interface LoginParams {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: User["role"][]) => boolean;
  updateMe: (data: { firstName?: string; lastName?: string; email?: string }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // On first load, try to turn a stored refresh token into a fresh access
  // token + user profile, so refreshing the page doesn't bounce to /login.
  React.useEffect(() => {
    (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.post("/auth/refresh", { refreshToken });
        setAccessToken(data.data.accessToken);
        setRefreshToken(data.data.refreshToken);
        const me = await unwrap<User>(api.get("/auth/me"));
        setUser(me);
      } catch {
        setAccessToken(null);
        setRefreshToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = React.useCallback(async ({ email, password, rememberMe }: LoginParams) => {
    const data = await unwrap<{ accessToken: string; refreshToken: string; user: User }>(
      api.post("/auth/login", { email, password, rememberMe })
    );
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, []);

  const hasRole = React.useCallback(
    (...roles: User["role"][]) => !!user && (user.role === "OWNER" || roles.includes(user.role)),
    [user]
  );

  const updateMe = React.useCallback(async (data: { firstName?: string; lastName?: string; email?: string }) => {
    const updated = await unwrap<User>(api.patch("/auth/me", data));
    setUser(updated);
  }, []);

  const changePassword = React.useCallback(async (data: { currentPassword: string; newPassword: string }) => {
    await api.post("/auth/change-password", data);
    // The server just revoked every refresh token for this account (including
    // this session's) — clear local state so ProtectedRoute bounces to /login.
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole, updateMe, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
