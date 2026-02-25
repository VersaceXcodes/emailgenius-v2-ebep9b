import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authClient } from '@/lib/auth/auth-client';

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

interface AuthenticationState {
  current_user: User | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

interface AppState {
  authentication_state: AuthenticationState;
  sign_in_email_password: (email: string, password: string) => Promise<void>;
  sign_up_email_password: (name: string, email: string, password: string) => Promise<void>;
  logout_user: () => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
}

const mapSessionUser = (sessionData: any): User | null => {
  const user = sessionData?.user;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
  };
};

const readAuthError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const maybeError = (error as any).error;
    const maybeMessage = (error as any).message;
    if (maybeError?.message) return maybeError.message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) return maybeMessage;
  }
  return fallback;
};

const withLoading = (state: AuthenticationState): AuthenticationState => ({
  ...state,
  authentication_status: {
    ...state.authentication_status,
    is_loading: true,
  },
  error_message: null,
});

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      authentication_state: {
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      sign_in_email_password: async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();

        set((state) => ({
          authentication_state: withLoading(state.authentication_state),
        }));

        try {
          const signInResult = await authClient.signIn.email({
            email: normalizedEmail,
            password,
          });

          if (signInResult.error) {
            throw new Error(signInResult.error.message || 'Invalid email or password');
          }

          const sessionResult = await authClient.getSession();
          const mappedUser = mapSessionUser(sessionResult.data);

          set(() => ({
            authentication_state: {
              current_user: mappedUser,
              authentication_status: {
                is_authenticated: Boolean(mappedUser),
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error) {
          const errorMessage = readAuthError(error, 'Sign in failed');
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      sign_up_email_password: async (name: string, email: string, password: string) => {
        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName) {
          const errorMessage = 'Full name is required';
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }

        set((state) => ({
          authentication_state: withLoading(state.authentication_state),
        }));

        try {
          const signUpResult = await authClient.signUp.email({
            name: normalizedName,
            email: normalizedEmail,
            password,
          });

          if (signUpResult.error) {
            throw new Error(signUpResult.error.message || 'Unable to create account');
          }

          const sessionResult = await authClient.getSession();
          const mappedUser = mapSessionUser(sessionResult.data);

          set(() => ({
            authentication_state: {
              current_user: mappedUser,
              authentication_status: {
                is_authenticated: Boolean(mappedUser),
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error) {
          const errorMessage = readAuthError(error, 'Sign up failed');
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout_user: async () => {
        try {
          const result = await authClient.signOut();
          if (result.error) {
            throw new Error(result.error.message || 'Failed to sign out');
          }
        } finally {
          set(() => ({
            authentication_state: {
              current_user: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      initialize_auth: async () => {
        set((state) => ({
          authentication_state: withLoading(state.authentication_state),
        }));

        try {
          const result = await authClient.getSession();
          const mappedUser = mapSessionUser(result.data);

          set(() => ({
            authentication_state: {
              current_user: mappedUser,
              authentication_status: {
                is_authenticated: Boolean(mappedUser),
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch {
          set(() => ({
            authentication_state: {
              current_user: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },
    }),
    {
      name: 'app-auth-storage',
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false,
          },
          error_message: null,
        },
      }),
    }
  )
);
