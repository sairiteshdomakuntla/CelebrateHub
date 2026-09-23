import { create } from "zustand";
import { authApi, type AuthUser, type LoginPayload, type RegisterPayload } from "../lib/auth.api";
import {
  storeTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  storeUserProfile,
  getStoredUserProfile,
  clearStoredUserProfile,
} from "../lib/api";

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

  // Called once on app boot — restores tokens AND the last known user
  // profile from secure storage, so the correct role renders on first frame
  // instead of flashing a default dashboard while /me resolves.
  initialize: async () => {
    try {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();
      if (accessToken && refreshToken) {
        const user = await getStoredUserProfile<AuthUser>();
        set({ accessToken, refreshToken, user, isInitialized: true });
      } else {
        set({ user: null, isInitialized: true });
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
      await storeUserProfile(result.user);
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
      await storeUserProfile(result.user);
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
      await clearStoredUserProfile();
      set({ user: null, accessToken: null, refreshToken: null });
    }
  },

  setUser: (user) => {
    set({ user });
    if (user) void storeUserProfile(user);
  },
}));
