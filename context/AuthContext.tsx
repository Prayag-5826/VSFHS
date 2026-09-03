import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, Role, AppSettings } from '../types';
import { api } from '../services/apiService';

interface AuthContextType extends AuthState {
  login: (idOrEmail: string, password?: string) => Promise<{ success: boolean; message?: string; attemptsLeft?: number }>;
  logout: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  fetchStats: () => Promise<{ visits: number; users: number; leads?: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Official VSF Corporate Defaults
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

// Helper to extract session cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

// SSO Session Initializer (Checks shared cookie first, then localStorage)
const getInitialSession = (): { user: User | null; isAuthenticated: boolean } => {
  try {
    // 1. Check shared SSO cookie
    const ssoCookie = getCookie('vsf_user_session');
    if (ssoCookie) {
      const parsedUser = JSON.parse(ssoCookie);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vs_active_user', JSON.stringify(parsedUser));
      }
      return { user: parsedUser, isAuthenticated: true };
    }

    // 2. Fallback to existing localStorage (e.g. mobile APK wrapper)
    if (typeof window !== 'undefined') {
      const activeSession = localStorage.getItem('vs_active_user');
      if (activeSession) {
        return { user: JSON.parse(activeSession), isAuthenticated: true };
      }
    }
  } catch (e) {
    console.error('Failed to parse SSO / cached session:', e);
  }
  return { user: null, isAuthenticated: false };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(getInitialSession);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Sync session on mount
    const ssoCookie = getCookie('vsf_user_session');
    if (ssoCookie && !authState.isAuthenticated) {
      try {
        const parsedUser = JSON.parse(ssoCookie);
        localStorage.setItem('vs_active_user', JSON.stringify(parsedUser));
        setAuthState({ user: parsedUser, isAuthenticated: true });
      } catch (e) {
        console.error('SSO Cookie sync error:', e);
      }
    }

    const initApp = async () => {
      try {
        const cloudSettings = await api.request('/settings');
        if (cloudSettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...cloudSettings
          });
        }
      } catch (e) {
        console.error('Cloud settings fetch failed (using local defaults):', e);
      }
    };
    initApp();
  }, [authState.isAuthenticated]);

  const login = async (idOrEmail: string, password?: string) => {
    try {
      const data = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: idOrEmail.trim(), password })
      });

      const token = data.access_token || `token-${data.user.id}-${Date.now()}`;

      // Set unified cookies across subdomains & localhost
      const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('vidhyasecurityforce.in');
      const domainAttr = isProd ? '; domain=.vidhyasecurityforce.in' : '';
      const maxAge = 60 * 60 * 24 * 7;

      document.cookie = `vsf_universal_token=${encodeURIComponent(token)}; path=/${domainAttr}; max-age=${maxAge}; SameSite=Lax; ${isProd ? 'Secure' : ''}`;
      document.cookie = `vsf_user_session=${encodeURIComponent(JSON.stringify(data.user))}; path=/${domainAttr}; max-age=${maxAge}; SameSite=Lax; ${isProd ? 'Secure' : ''}`;

      localStorage.setItem('vs_token', token);
      localStorage.setItem('vs_active_user', JSON.stringify(data.user));
      setAuthState({ user: data.user, isAuthenticated: true });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Login Failed',
        attemptsLeft: err.attemptsLeft
      };
    }
  };

  const logout = () => {
    const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('vidhyasecurityforce.in');
    const domainAttr = isProd ? '; domain=.vidhyasecurityforce.in' : '';

    // Clear wildcard cross-subdomain tokens
    document.cookie = `vsf_universal_token=; path=/${domainAttr}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
    document.cookie = `vsf_user_session=; path=/${domainAttr}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;

    // Clear local storage
    localStorage.removeItem('vs_active_user');
    localStorage.removeItem('vs_token');

    setAuthState({ user: null, isAuthenticated: false });

    // Redirect to central website login
    const loginTarget = isProd
      ? 'https://vidhyasecurityforce.in/login'
      : 'http://localhost:3000/login';
    window.location.href = loginTarget;
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await api.request('/settings', {
        method: 'POST',
        body: JSON.stringify(newSettings)
      });
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to update cloud settings', err);
      setSettings(newSettings);
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
