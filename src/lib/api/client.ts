import axios from "axios";

const TOKEN_KEY = "tree_house_token";
// Cookie name used by middleware (same value, different storage)
const TOKEN_COOKIE = "tree_house_token";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const IMPERSONATE_KEY = "impersonating_pk";

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    const impersonatePk = sessionStorage.getItem(IMPERSONATE_KEY);
    if (impersonatePk) {
      config.headers["X-Impersonate-User"] = impersonatePk;
    }
  }
  // Let the browser set multipart boundary (default instance uses application/json).
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === "undefined") return Promise.reject(error);
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = "/signin";
    }
    // 403 — propagate as-is; call sites show inline permission errors
    return Promise.reject(error);
  },
);

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // Sync to cookie so Next.js middleware can read it (Edge has no localStorage)
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export const impersonation = {
  start: (pk: number): void => {
    if (typeof window !== "undefined") sessionStorage.setItem(IMPERSONATE_KEY, String(pk));
  },
  stop: (): void => {
    if (typeof window !== "undefined") sessionStorage.removeItem(IMPERSONATE_KEY);
  },
  isActive: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem(IMPERSONATE_KEY);
  },
  getTargetPk: (): number | null => {
    if (typeof window === "undefined") return null;
    const val = sessionStorage.getItem(IMPERSONATE_KEY);
    return val ? Number(val) : null;
  },
};

/** Returns true when a 403 Forbidden response was received. */
export function isForbidden(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}

export default api;
