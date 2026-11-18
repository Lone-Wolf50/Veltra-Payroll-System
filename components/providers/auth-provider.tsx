"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/types";
import { Role } from "@/lib/roles";
import {
  getMockUsers,
  getConnectionStatus,
  setConnectionState,
  ConnectionState,
  subscribeDataStore,
} from "@/lib/data";

interface AuthContextValue {
  user: User;
  allUsers: User[];
  signInAsRole: (role: Role) => void;
  signInWithEmail: (email: string) => { ok: boolean; error?: string };
  signOut: () => void;
  connectionState: ConnectionState;
  pendingSyncCount: number;
  setSimulatedConnectionState: (state: ConnectionState) => void;
  storeTick: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "veltra_active_user_role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const allUsers = getMockUsers();
  // Default to HR/Payroll Officer (Akua Mensah) as the primary demo persona
  const [user, setUser] = useState<User>(allUsers[0]);
  const [storeTick, setStoreTick] = useState(0);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(STORAGE_KEY) as Role | null;
      if (savedRole) {
        const found = allUsers.find((u) => u.role === savedRole);
        if (found) setUser(found);
      }
    } catch {
      // ignore storage errors
    }
  }, [allUsers]);

  useEffect(() => {
    return subscribeDataStore(() => {
      setStoreTick((t) => t + 1);
    });
  }, []);

  const signInAsRole = (role: Role) => {
    const found = allUsers.find((u) => u.role === role);
    if (found) {
      setUser(found);
      try {
        localStorage.setItem(STORAGE_KEY, found.role);
      } catch {}
    }
  };

  const signInWithEmail = (email: string) => {
    const found = allUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      return {
        ok: false,
        error: "No demo account matches that email. Select one of the 5 role accounts below.",
      };
    }
    setUser(found);
    try {
      localStorage.setItem(STORAGE_KEY, found.role);
    } catch {}
    return { ok: true };
  };

  const signOut = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const conn = getConnectionStatus();

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        signInAsRole,
        signInWithEmail,
        signOut,
        connectionState: conn.state,
        pendingSyncCount: conn.pendingCount,
        setSimulatedConnectionState: setConnectionState,
        storeTick,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
