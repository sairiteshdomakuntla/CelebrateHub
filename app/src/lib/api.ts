import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

// ─── Token storage (secure on device, localStorage fallback on web) ──────────

const TOKEN_KEY = "ch_access_token";
const REFRESH_KEY = "ch_refresh_token";

export async function storeTokens(access: string, refresh: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(REFRESH_KEY);
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}

// ─── Axios instance ──────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Inject access token on every request
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let waitQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          waitQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const rt = await getRefreshToken();
        if (!rt) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken: rt,
        });

        const { accessToken, refreshToken } = data.data;
        await storeTokens(accessToken, refreshToken);

        waitQueue.forEach((cb) => cb(accessToken));
        waitQueue = [];

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await clearTokens();
        waitQueue = [];
        // Signal to Zustand store to clear user (handled by store subscription)
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
