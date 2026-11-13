import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile, Role } from '@/types';
import { getAllProfiles, createProfile } from '@/db/api';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'netpos_current_user';
const USERS_CREDENTIALS_KEY = 'netpos_user_credentials';
const LOGGED_OUT_KEY = 'netpos_logged_out';

const DEFAULT_SEEDED_PASSWORDS: Record<string, string> = {
  usr_admin_1: 'admin123',
  usr_staff_1: 'staff123',
  usr_staff_2: 'staff123',
};

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministic encoding if crypto.subtle is unavailable
  return btoa(unescape(encodeURIComponent(password)));
}

function getCredentialsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USERS_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCredentialsMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(USERS_CREDENTIALS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

async function ensureSeededCredentials(): Promise<Record<string, string>> {
  const creds = getCredentialsMap();
  let changed = false;
  for (const [userId, defaultPass] of Object.entries(DEFAULT_SEEDED_PASSWORDS)) {
    if (!creds[userId]) {
      creds[userId] = await hashPassword(defaultPass);
      changed = true;
    }
  }
  if (changed) {
    saveCredentialsMap(creds);
  }
  return creds;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing session on boot
  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = async () => {
    try {
      await ensureSeededCredentials();
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
        await syncProfile(parsed.id);
      } else if (!localStorage.getItem(LOGGED_OUT_KEY)) {
        // Default login as admin only on initial boot before any explicit logout
        const profiles = await getAllProfiles();
        const adminProfile = profiles.find((p) => p.role === 'admin') || profiles[0];
        if (adminProfile) {
          const defaultUser = { id: adminProfile.id, username: adminProfile.username };
          setUser(defaultUser);
          setProfile(adminProfile);
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
        }
      }
    } catch (err) {
      console.error('Session load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncProfile = async (userId: string) => {
    const profiles = await getAllProfiles();
    const found = profiles.find((p) => p.id === userId);
    if (found) {
      setProfile(found);
    }
  };

  const signInWithUsername = async (username: string, password: string) => {
    try {
      if (!password) {
        return { error: new Error('Please enter your password.') };
      }

      const profiles = await getAllProfiles();
      const existing = profiles.find((p) => p.username.toLowerCase() === username.trim().toLowerCase());

      if (!existing) {
        return { error: new Error('Invalid username or password.') };
      }

      const creds = await ensureSeededCredentials();
      const storedHash = creds[existing.id];
      const enteredHash = await hashPassword(password);

      if (!storedHash || storedHash !== enteredHash) {
        return { error: new Error('Incorrect password. Please try again.') };
      }

      const sessionUser: User = { id: existing.id, username: existing.username };
      setUser(sessionUser);
      setProfile(existing);
      localStorage.removeItem(LOGGED_OUT_KEY);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Login failed') };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    try {
      const trimmedUsername = username.trim();
      if (!password || password.length < 6) {
        return { error: new Error('Password must be at least 6 characters.') };
      }

      const profiles = await getAllProfiles();
      const exists = profiles.some((p) => p.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (exists) {
        return { error: new Error('Username already taken. Please choose another.') };
      }

      // First user is admin, otherwise staff
      const role: Role = profiles.length === 0 ? 'admin' : 'staff';
      const newProfile: Profile = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: trimmedUsername,
        role,
        created_at: new Date().toISOString(),
      };

      const creds = await ensureSeededCredentials();
      creds[newProfile.id] = await hashPassword(password);
      saveCredentialsMap(creds);

      await createProfile(newProfile);

      const sessionUser: User = { id: newProfile.id, username: newProfile.username };
      setUser(sessionUser);
      setProfile(newProfile);
      localStorage.removeItem(LOGGED_OUT_KEY);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Signup failed') };
    }
  };

  const signOut = async () => {
    localStorage.setItem(LOGGED_OUT_KEY, 'true');
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await syncProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
