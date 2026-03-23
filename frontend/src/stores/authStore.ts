import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../services/api';
import { authService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updatePoints: (points: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.error || 'Login failed', isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(email, password);
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.error || 'Registration failed', isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('auth-storage');
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await authService.me();
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          // 如果是 401 错误（token 无效），不清除 token，只更新状态
          if (error.error === 'Invalid token' || error.status === 401) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } else {
            // 其他错误，保持当前状态
            set({ isLoading: false });
          }
        }
      },

      updatePoints: (points: number) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, points } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
