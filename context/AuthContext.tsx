
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, Role, AppSettings } from '../types';
import { api } from '../services/apiService';

interface AuthContextType extends AuthState {
  login: (idOrEmail: string, password?: string) => Promise<{ success: boolean; message?: string; attemptsLeft?: number }>;
  logout: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  fetchStats: () => Promise<{ visits: number; users: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
    logo: '',
    contactNo: '9826259292'
  });

  useEffect(() => {
    const initApp = async () => {
      try {
        // Load settings from Supabase Cloud
        const cloudSettings = await api.request('/settings');
        if (cloudSettings) {
          setSettings(cloudSettings);
        }

        const activeSession = localStorage.getItem('vs_active_user');
        if (activeSession) {
          setAuthState({ user: JSON.parse(activeSession), isAuthenticated: true });
        }
      } catch (e) {
        console.error("Initialization failed", e);
      }
    };
    initApp();
  }, []);

  const login = async (idOrEmail: string, password?: string) => {
    try {
      const data = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: idOrEmail, password })
      });
      
      localStorage.setItem('vs_token', data.access_token);
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
    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem('vs_active_user');
    localStorage.removeItem('vs_token');
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await api.request('/settings', {
        method: 'POST',
        body: JSON.stringify(newSettings)
      });
      setSettings(newSettings);
    } catch (err) {
      console.error("Failed to update cloud settings", err);
      // Fallback update locally so the UI feels responsive
      setSettings(newSettings);
    }
  };

  const fetchStats = async () => {
    return await api.request('/stats');
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
