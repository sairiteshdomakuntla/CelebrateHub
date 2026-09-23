import { create } from "zustand";
import { authApi, type AuthUser, type LoginPayload, type RegisterPayload } from "../lib/auth.api";
import { storeTokens, clearTokens, getAccessToken, getRefreshToken } from "../lib/api";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isInitialized: false,

  // Called once on app boot — restores tokens from secure storage
  initialize: async () => {
    try {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();
      if (accessToken && refreshToken) {
        // Tokens exist — the user is considered logged in.
        // The actual user object will be populated after the first API call
        // or we can store it in SecureStore too. For now mark as having tokens.
        set({ accessToken, refreshToken, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login(payload);
      await storeTokens(result.accessToken, result.refreshToken);
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(payload);
      await storeTokens(result.accessToken, result.refreshToken);
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const rt = get().refreshToken;
    try {
      if (rt) await authApi.logout(rt);
    } finally {
      await clearTokens();
      set({ user: null, accessToken: null, refreshToken: null });
    }
  },

  setUser: (user) => set({ user }),
}));
