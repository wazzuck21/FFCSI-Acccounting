import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { saveLocalData, getLocalData } from '../lib/idbStorage';

interface AuthContextType {
  currentUser: User | null;
  allUsers: User[];
  login: (username: string, password?: string) => boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  hasPermission: (permissionKey: keyof User['permissions'], clientId?: string) => boolean;
  isSuperAdmin: boolean;
  updateUsers: (newUsers: User[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Default null to show sign page first

  useEffect(() => {
    // Load saved users or state
    async function loadSavedUsers() {
      const savedUsers = await getLocalData<User[]>('afms_users');
      if (savedUsers && savedUsers.length > 0) {
        setAllUsers(savedUsers);
      }
      const savedCurrent = await getLocalData<User>('afms_current_user');
      if (savedCurrent) {
        setCurrentUser(savedCurrent);
      }
    }
    loadSavedUsers();
  }, []);

  const updateUsers = (newUsers: User[]) => {
    setAllUsers(newUsers);
    saveLocalData('afms_users', newUsers);
  };

  const login = (usernameInput: string, passwordInput?: string) => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const found = allUsers.find(
      u => (
        u.username.toLowerCase() === cleanUsername ||
        (u.email && u.email.toLowerCase() === cleanUsername)
      ) && 
      (passwordInput !== undefined ? (u.password ? u.password === passwordInput : true) : true) &&
      u.status === 'Active'
    );
    if (found) {
      const updated = { ...found, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19) };
      setCurrentUser(updated);
      saveLocalData('afms_current_user', updated);
      return true;
    }
    return false;
  };

  const switchUser = (userId: string) => {
    const found = allUsers.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      saveLocalData('afms_current_user', found);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    saveLocalData('afms_current_user', null);
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const hasPermission = (permissionKey: keyof User['permissions'], clientId?: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    
    // Check key permission boolean
    const val = currentUser.permissions[permissionKey];
    if (typeof val === 'boolean' && !val) return false;

    // Check client specific restriction if specified
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
        login,
        switchUser,
        logout,
        hasPermission,
        isSuperAdmin,
        updateUsers,
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
