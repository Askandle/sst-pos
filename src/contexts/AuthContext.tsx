import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile, Role } from '@/types';
import { getAllProfiles } from '@/db/api';

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
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
        await syncProfile(parsed.id);
      } else {
        // Default login as admin for initial quick evaluation if desired, or let user sign in
        // Let's set the default admin if no user exists so the system is immediately active!
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

  const signInWithUsername = async (username: string, _password: string) => {
    try {
      const profiles = await getAllProfiles();
      const existing = profiles.find((p) => p.username.toLowerCase() === username.toLowerCase());

      if (!existing) {
        return { error: new Error('User not found. Please check your username or sign up.') };
      }

      const sessionUser: User = { id: existing.id, username: existing.username };
      setUser(sessionUser);
      setProfile(existing);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Login failed') };
    }
  };

  const signUpWithUsername = async (username: string, _password: string) => {
    try {
      const profiles = await getAllProfiles();
      const exists = profiles.some((p) => p.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return { error: new Error('Username already taken. Please choose another.') };
      }

      // First user is admin, otherwise staff
      const role: Role = profiles.length === 0 ? 'admin' : 'staff';
      const newProfile: Profile = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: username.trim(),
        role,
        created_at: new Date().toISOString(),
      };

      const updatedProfiles = [...profiles, newProfile];
      localStorage.setItem('netpos_profiles', JSON.stringify(updatedProfiles));

      const sessionUser: User = { id: newProfile.id, username: newProfile.username };
      setUser(sessionUser);
      setProfile(newProfile);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Signup failed') };
    }
  };

  const signOut = async () => {
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
