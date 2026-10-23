import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, AppSettings } from '../types';
import { api, getSessionToken, isNetworkError } from '../services/apiService';
import { identifyUser } from '../services/monitoring';

interface LoginResult {
  success: boolean;
  message?: string;
  attemptsLeft?: number;
  user?: User;
}

interface AuthContextType extends AuthState {
  login: (idOrEmail: string, password?: string) => Promise<LoginResult>;
  logout: (opts?: { redirect?: boolean }) => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  fetchStats: () => Promise<{ visits: number; users: number; leads?: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Official VSF corporate defaults (replaced by the database values once loaded)
const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
  logo: '/assets/logo.png',
  contactNo: '9826259292',
  email: 'contact@vidhyasecurityforce.in',
  address: '012 A Block, Treasure Town, Indore, Madhya Pradesh',
  gstNumber: '23AQRPD0652Q2ZI',
  psaraLicense: 'PSA/L/74/MP/2023/FEB/3/425',
  directorName: 'Anil Dhariwal',
  sealImage: ''
};

/* -------------------------------------------------------------------------- */
/*  Cookie / storage helpers                                                   */
/* -------------------------------------------------------------------------- */

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/** True only for the website build served from the company domain. The APK is never "prod web". */
const isProdWeb = () =>
  typeof window !== 'undefined' && window.location.hostname.endsWith('vidhyasecurityforce.in');

const cookieSuffix = (maxAge: number) => {
  const domain = isProdWeb() ? '; domain=.vidhyasecurityforce.in' : '';
  const secure = isProdWeb() ? '; Secure' : '';
  return `; path=/${domain}; max-age=${maxAge}; SameSite=Lax${secure}`;
};

const persistSession = (token: string, user: User) => {
  const week = 60 * 60 * 24 * 7;

  // Cookies are limited to ~4 KB, so never put a base64 avatar in them.
  const avatar = (user as any)?.avatar;
  const cookieUser = { ...user, avatar: typeof avatar === 'string' && avatar.length < 300 ? avatar : undefined };

  document.cookie = `vsf_universal_token=${encodeURIComponent(token)}${cookieSuffix(week)}`;
  document.cookie = `vsf_user_session=${encodeURIComponent(JSON.stringify(cookieUser))}${cookieSuffix(week)}`;

  localStorage.setItem('vs_token', token);
  localStorage.setItem('vs_active_user', JSON.stringify(user));
};

const clearLocalSession = () => {
  document.cookie = `vsf_universal_token=${cookieSuffix(0)}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `vsf_user_session=${cookieSuffix(0)}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  localStorage.removeItem('vs_active_user');
  localStorage.removeItem('vs_token');
};

/** A session needs both a stored user and a token; the server re-checks the token on start-up. */
const getInitialSession = (): { user: User | null; isAuthenticated: boolean } => {
  try {
    const token = getSessionToken();
    if (!token) return { user: null, isAuthenticated: false };

    const ssoCookie = getCookie('vsf_user_session');
    if (ssoCookie) {
      const parsedUser = JSON.parse(ssoCookie);
      localStorage.setItem('vs_active_user', JSON.stringify(parsedUser));
      localStorage.setItem('vs_token', token);
      return { user: parsedUser, isAuthenticated: true };
    }

    const activeSession = localStorage.getItem('vs_active_user');
    if (activeSession) {
      return { user: JSON.parse(activeSession), isAuthenticated: true };
    }
  } catch (e) {
    console.error('Failed to parse cached session:', e);
  }
  return { user: null, isAuthenticated: false };
};

const getCachedSettings = (): Partial<AppSettings> => {
  try {
    const raw = localStorage.getItem('vsf_app_settings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(getInitialSession);
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...getCachedSettings()
  }));

  // Identify user in Sentry on app mount if session is cached
  useEffect(() => {
    if (authState.user) {
      identifyUser({ id: String(authState.user.id), role: authState.user.role });
    } else {
      identifyUser(null);
    }
  }, []);

  // Ask the server whether the stored session is still valid (expired, blocked or role changed).
  // Offline is fine: we keep the cached session and only sign out on a definite "no".
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const me = await api.request('/auth/me');
        if (cancelled) return;

        if (!me) {
          clearLocalSession();
          identifyUser(null);
          setAuthState({ user: null, isAuthenticated: false });
          return;
        }

        setAuthState((prev) => {
          const p: any = prev.user || {};
          if (p.role === me.role && p.name === me.name && p.status === me.status) return prev;
          const merged = { ...p, ...me } as User;
          localStorage.setItem('vs_active_user', JSON.stringify(merged));
          identifyUser({ id: String(merged.id), role: merged.role });
          return { user: merged, isAuthenticated: true };
        });
      } catch (err) {
        if (!isNetworkError(err)) console.warn('Session check skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authState.isAuthenticated]);

  // Load company settings: public branding before login, the full row after login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cloud = await api.request('/settings');
        if (cloud && !cancelled) setSettings({ ...DEFAULT_SETTINGS, ...cloud });
      } catch (e) {
        console.error('Cloud settings fetch failed (using cached defaults):', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authState.isAuthenticated]);

  const login = async (idOrEmail: string, password?: string): Promise<LoginResult> => {
    try {
      const data = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: idOrEmail.trim(), password })
      });

      if (!data?.access_token || !data?.user) {
        return { success: false, message: 'Login failed. Please try again.' };
      }

      persistSession(data.access_token, data.user);
      setAuthState({ user: data.user, isAuthenticated: true });

      // Associate crash reports with officer id and role
      identifyUser({ id: String(data.user.id), role: data.user.role });

      return { success: true, user: data.user };
    } catch (err: any) {
      return {
        success: false,
        message: isNetworkError(err)
          ? 'No connection. Please check your network and try again.'
          : err?.message || 'Login failed',
        attemptsLeft: err?.attemptsLeft
      };
    }
  };

  const logout = (opts: { redirect?: boolean } = {}) => {
    const redirect = opts.redirect !== false;

    // Reset user tracking in Sentry
    identifyUser(null);

    // Leave the app immediately; end the server session in the background.
    setAuthState({ user: null, isAuthenticated: false });

    const finish = () => {
      clearLocalSession();
      // Only the website build hands over to the website login. The APK stays in the app.
      if (redirect && isProdWeb()) {
        window.location.href = 'https://vidhyasecurityforce.in/login';
      }
    };

    Promise.race([
      api.request('/auth/logout').catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]).finally(finish);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    // The Settings page writes to the database itself; this refreshes app state and the local cache.
    setSettings(newSettings);
    try {
      await api.request('/settings', { method: 'POST', body: JSON.stringify(newSettings) });
    } catch (err) {
      console.error('Failed to cache settings locally', err);
    }
  };

  const fetchStats = async () => {
    try {
      return await api.request('/stats');
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      return { visits: 0, users: 0, leads: 0 };
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, settings, updateSettings, fetchStats }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
