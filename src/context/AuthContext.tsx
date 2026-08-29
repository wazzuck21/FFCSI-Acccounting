import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { saveLocalData, getLocalData } from '../lib/idbStorage';
import { hashPassword, verifyPassword, generateSessionToken } from '../lib/cryptoUtils';
import { can, AppAction, AppResource, AuthContextRule } from '../lib/rbac';

interface LoginResult {
  success: boolean;
  message?: string;
  isLocked?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  sessionToken: string | null;
  login: (username: string, passwordInput: string) => Promise<LoginResult>;
  quickSwitchUser: (userId: string) => Promise<boolean>;
  logout: () => void;
  logoutAllSessions: () => void;
  can: (action: AppAction, resource: AppResource, context?: AuthContextRule) => boolean;
  hasPermission: (permissionKey: keyof User['permissions'], clientId?: string) => boolean;
  isSuperAdmin: boolean;
  updateUsers: (newUsers: User[]) => void;
  resetUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
  changePassword: (userId: string, currentPasswordInput: string, newPasswordInput: string) => Promise<{ success: boolean; message?: string }>;
  sessionMinutesRemaining: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session Constants
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes Idle Timeout
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 Hours Max Session Age
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Minutes Lockout

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionMinutesRemaining, setSessionMinutesRemaining] = useState<number>(15);

  // Failed login tracking: { [username]: { attempts: number, lockedUntil: number } }
  const failedAttemptsRef = useRef<Record<string, { attempts: number; lockedUntil: number }>>({});
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Ensure initial seed users are hashed asynchronously on startup if needed
  useEffect(() => {
    async function initializeAndLoadUsers() {
      const savedUsers = await getLocalData<User[]>('afms_users');
      let userListToUse = (savedUsers && savedUsers.length > 0) ? savedUsers : INITIAL_USERS;

      // Check if any users lack passwordHash and generate it
      let needsSave = false;
      const updatedList = await Promise.all(
        userListToUse.map(async (u) => {
          if (!u.passwordHash && u.password) {
            needsSave = true;
            const { hash, salt } = await hashPassword(u.password);
            const { password, ...cleanedUser } = u; // strip plaintext password
            return {
              ...cleanedUser,
              passwordHash: hash,
              salt
            };
          }
          return u;
        })
      );

      if (needsSave || !savedUsers) {
        setAllUsers(updatedList);
        saveLocalData('afms_users', updatedList);
      } else {
        setAllUsers(userListToUse);
      }

      // Check for active session in sessionStorage
      const savedSessionToken = sessionStorage.getItem('afms_session_token');
      const savedUserId = sessionStorage.getItem('afms_session_user_id');
      const savedSessionStart = sessionStorage.getItem('afms_session_start_time');

      if (savedSessionToken && savedUserId && savedSessionStart) {
        const sessionAge = Date.now() - parseInt(savedSessionStart, 10);
        if (sessionAge < SESSION_MAX_AGE_MS) {
          const userObj = updatedList.find(u => u.id === savedUserId && u.status === 'Active');
          if (userObj) {
            setCurrentUser(userObj);
            setSessionToken(savedSessionToken);
            sessionStartTimeRef.current = parseInt(savedSessionStart, 10);
            lastActivityRef.current = Date.now();
          } else {
            sessionStorage.clear();
          }
        } else {
          sessionStorage.clear();
        }
      }
    }

    initializeAndLoadUsers();
  }, []);

  const updateUsers = (newUsers: User[]) => {
    setAllUsers(newUsers);
    saveLocalData('afms_users', newUsers);
  };

  // Helper to reset a user's password securely with hash
  const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    if (!newPassword || newPassword.length < 6) return false;
    const { hash, salt } = await hashPassword(newPassword);
    
    const updatedUsers = allUsers.map(u => {
      if (u.id === userId) {
        const { password, ...cleaned } = u;
        return {
          ...cleaned,
          passwordHash: hash,
          salt
        };
      }
      return u;
    });

    updateUsers(updatedUsers);
    return true;
  };

  // Helper for users to change their own password with old password verification
  const changePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string): Promise<{ success: boolean; message?: string }> => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'User account not found.' };
    }

    // Verify current password unless user is Super Admin resetting without current
    let isCurrentValid = false;
    if (targetUser.passwordHash && targetUser.salt) {
      isCurrentValid = await verifyPassword(currentPasswordInput, targetUser.passwordHash, targetUser.salt);
    } else if (targetUser.password) {
      isCurrentValid = targetUser.password === currentPasswordInput;
    }

    if (!isCurrentValid) {
      return { success: false, message: 'Current password does not match our records.' };
    }

    const { hash, salt } = await hashPassword(newPasswordInput);
    const updatedUsers = allUsers.map(u => {
      if (u.id === userId) {
        const { password, ...cleaned } = u;
        return {
          ...cleaned,
          passwordHash: hash,
          salt
        };
      }
      return u;
    });

    updateUsers(updatedUsers);

    // If current logged-in user changed their password, update active currentUser state
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => prev ? {
        ...prev,
        passwordHash: hash,
        salt
      } : null);
    }

    return { success: true, message: 'Password changed successfully! Updated across User Management & RBAC.' };
  };

  // Session Logout
  const logout = useCallback(() => {
    setCurrentUser(null);
    setSessionToken(null);
    sessionStorage.removeItem('afms_session_token');
    sessionStorage.removeItem('afms_session_user_id');
    sessionStorage.removeItem('afms_session_start_time');
    saveLocalData('afms_current_user', null);
  }, []);

  const logoutAllSessions = useCallback(() => {
    logout();
  }, [logout]);

  // Session Activity & Idle Timeout Monitoring
  useEffect(() => {
    if (!currentUser) return;

    const resetActivityTimer = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivityTimer);
    window.addEventListener('keydown', resetActivityTimer);
    window.addEventListener('click', resetActivityTimer);
    window.addEventListener('scroll', resetActivityTimer);

    const intervalId = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const sessionAge = now - sessionStartTimeRef.current;

      const idleRemainingMs = Math.max(0, IDLE_TIMEOUT_MS - idleTime);
      setSessionMinutesRemaining(Math.ceil(idleRemainingMs / 60000));

      if (idleTime >= IDLE_TIMEOUT_MS) {
        console.warn('Session expired due to 15 minutes of inactivity.');
        logout();
      } else if (sessionAge >= SESSION_MAX_AGE_MS) {
        console.warn('Session expired due to 8-hour maximum session age.');
        logout();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetActivityTimer);
      window.removeEventListener('keydown', resetActivityTimer);
      window.removeEventListener('click', resetActivityTimer);
      window.removeEventListener('scroll', resetActivityTimer);
      clearInterval(intervalId);
    };
  }, [currentUser, logout]);

  // Login handler with Rate Limiting & Hash Verification
  const login = async (usernameInput: string, passwordInput: string): Promise<LoginResult> => {
    const cleanUsername = usernameInput.trim().toLowerCase();

    // Rate Limiting Check
    const attemptsRecord = failedAttemptsRef.current[cleanUsername];
    if (attemptsRecord) {
      if (Date.now() < attemptsRecord.lockedUntil) {
        const minsLeft = Math.ceil((attemptsRecord.lockedUntil - Date.now()) / 60000);
        return {
          success: false,
          isLocked: true,
          message: `Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${minsLeft} minute(s).`
        };
      } else if (attemptsRecord.lockedUntil > 0 && Date.now() >= attemptsRecord.lockedUntil) {
        // Reset after lockout expired
        delete failedAttemptsRef.current[cleanUsername];
      }
    }

    const foundUser = allUsers.find(
      u => (u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername))
    );

    if (!foundUser) {
      recordFailedAttempt(cleanUsername);
      return { success: false, message: 'Invalid username or password.' };
    }

    if (foundUser.status !== 'Active') {
      return { success: false, message: 'Account is inactive or disabled. Contact administrator.' };
    }

    let isValid = false;

    // 1. Verify against passwordHash if present
    if (foundUser.passwordHash && foundUser.salt) {
      isValid = await verifyPassword(passwordInput, foundUser.passwordHash, foundUser.salt);
    } 
    // 2. Fallback to legacy plaintext password & auto-migrate to hash
    else if (foundUser.password) {
      if (foundUser.password === passwordInput) {
        isValid = true;
        // Auto-migrate to PBKDF2 hash immediately
        const { hash, salt } = await hashPassword(passwordInput);
        const { password, ...cleanedUser } = foundUser;
        const updatedUser = { ...cleanedUser, passwordHash: hash, salt };
        const newUsers = allUsers.map(u => u.id === foundUser.id ? updatedUser : u);
        updateUsers(newUsers);
      }
    }

    if (!isValid) {
      const lockInfo = recordFailedAttempt(cleanUsername);
      if (lockInfo.isLocked) {
        return {
          success: false,
          isLocked: true,
          message: 'Account temporarily locked due to 5 failed attempts. Please try again in 15 minutes.'
        };
      }
      return { 
        success: false, 
        message: `Invalid username or password. (${MAX_FAILED_ATTEMPTS - lockInfo.attempts} attempt(s) remaining)` 
      };
    }

    // Successful Login: Reset failed attempts counter
    delete failedAttemptsRef.current[cleanUsername];

    const newSessionToken = generateSessionToken();
    const updatedUserObj: User = {
      ...foundUser,
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    // Remove legacy plaintext password field from active user state
    delete updatedUserObj.password;

    setCurrentUser(updatedUserObj);
    setSessionToken(newSessionToken);
    lastActivityRef.current = Date.now();
    sessionStartTimeRef.current = Date.now();

    sessionStorage.setItem('afms_session_token', newSessionToken);
    sessionStorage.setItem('afms_session_user_id', updatedUserObj.id);
    sessionStorage.setItem('afms_session_start_time', Date.now().toString());

    return { success: true };
  };

  const recordFailedAttempt = (cleanUsername: string) => {
    const current = failedAttemptsRef.current[cleanUsername] || { attempts: 0, lockedUntil: 0 };
    const attempts = current.attempts + 1;
    let lockedUntil = 0;
    let isLocked = false;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      isLocked = true;
    }

    failedAttemptsRef.current[cleanUsername] = { attempts, lockedUntil };
    return { attempts, isLocked };
  };

  // Switch User helper (used for demo user switching, auto-authenticates without exposing password)
  const quickSwitchUser = async (userId: string): Promise<boolean> => {
    const found = allUsers.find(u => u.id === userId && u.status === 'Active');
    if (found) {
      const newSessionToken = generateSessionToken();
      const { password, ...cleaned } = found;
      const updatedUserObj = {
        ...cleaned,
        lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      setCurrentUser(updatedUserObj);
      setSessionToken(newSessionToken);
      lastActivityRef.current = Date.now();
      sessionStartTimeRef.current = Date.now();

      sessionStorage.setItem('afms_session_token', newSessionToken);
      sessionStorage.setItem('afms_session_user_id', updatedUserObj.id);
      sessionStorage.setItem('afms_session_start_time', Date.now().toString());

      return true;
    }
    return false;
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Centralized Authorization check
  const authCan = (action: AppAction, resource: AppResource, context?: AuthContextRule) => {
    return can(currentUser, action, resource, context);
  };

  const hasPermission = (permissionKey: keyof User['permissions'], clientId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    
    const val = currentUser.permissions[permissionKey];
    if (typeof val === 'boolean' && !val) return false;

    if (clientId && currentUser.permissions.clientAccessList && currentUser.permissions.clientAccessList.length > 0) {
      if (!currentUser.permissions.clientAccessList.includes(clientId)) {
        return false;
      }
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        sessionToken,
        login,
        quickSwitchUser,
        logout,
        logoutAllSessions,
        can: authCan,
        hasPermission,
        isSuperAdmin,
        updateUsers,
        resetUserPassword,
        changePassword,
        sessionMinutesRemaining
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
