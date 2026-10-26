import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.auth.me,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnMount: "always"
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["movements"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], null);
    }
  });

  // Any 401 from an API call means the session expired: reflect that in state
  // so protected routes send the user back to the sign-in screen.
  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(["auth", "me"], null);
    };
    window.addEventListener("stockledger:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("stockledger:unauthorized", handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });
      return result.user;
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const user = meQuery.data ?? null;
  const status: AuthContextValue["status"] =
    user !== null ? "authenticated" : meQuery.isPending ? "loading" : "anonymous";

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      isLoggingIn: loginMutation.isPending,
      isLoggingOut: logoutMutation.isPending
    }),
    [user, status, login, logout, loginMutation.isPending, logoutMutation.isPending]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
