import { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError) {
          if ([400, 401, 403, 404].includes(error.status)) return false;
          if (error.status === 0) return failureCount < 2;
        }
        return failureCount < 1;
      }
    },
    mutations: { retry: 0 }
  }
});
