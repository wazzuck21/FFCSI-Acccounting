import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  User as UserIcon, 
  LogOut, 
  ChevronDown, 
  Bell, 
  ShieldCheck, 
  Sparkles,
  Search,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onSearchQuery?: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchQuery, onToggleMobileMenu }) => {
  const { currentUser, allUsers, quickSwitchUser, logout, isSuperAdmin, sessionMinutesRemaining } = useAuth();
  const { syncStatus } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 px-6 py-3 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Sync Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
            aria-label="Toggle navigation menu"
            title="Open core navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-tight text-lg text-slate-900">AFMS</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hidden sm:inline-block">
                Offline-First PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">Accounting Firm Management System</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search clients, TIN, tax forms, payables, documents..."
              onChange={(e) => onSearchQuery?.(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
        </div>

        {/* Sync Status Badge & User Controls */}
        <div className="flex items-center gap-3">
          
          {/* Cloud Sync Status Indicator */}
          <div 
            title={syncStatus === 'Online' ? 'Firestore & IndexedDB Synced' : 'Working 100% Offline with IndexedDB'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              syncStatus === 'Online' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : syncStatus === 'Offline'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
            }`}
          >
            {syncStatus === 'Online' && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            {syncStatus === 'Offline' && <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            {syncStatus === 'Syncing' && <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
            <span className="hidden sm:inline">
              {syncStatus === 'Online' ? 'Cloud Synced' : syncStatus === 'Offline' ? 'Offline Saved' : 'Syncing...'}
            </span>
          </div>

          {/* Quick Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 text-slate-800 text-xs">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">Notifications</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">3 Due Today</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200/60">
                    <p className="font-bold text-amber-800">DTI Certificate Expiring</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Reyes Architecture DTI registration expires in 12 days.</p>
                  </div>
                  <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200/60">
                    <p className="font-bold text-blue-800">0619E Remittance Due</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">Monthly withholding tax due for 3 active clients.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active User Switcher / Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all bg-slate-50"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                {currentUser?.fullName.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden lg:block pr-1">
                <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium uppercase font-mono">
                  {isSuperAdmin && <ShieldCheck className="w-3 h-3 text-amber-600" />}
                  {currentUser?.role ? currentUser.role.replace('_', ' ') : 'USER'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs text-slate-800">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900">{currentUser?.fullName}</p>
                  <p className="text-indigo-600 font-mono text-[11px] font-bold">@{currentUser?.username}</p>
                  <div className="mt-1 flex items-center justify-between gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                      Role: {currentUser?.role}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium font-mono" title="Idle session auto-logout time">
                      Session: {sessionMinutesRemaining}m idle
                    </span>
                  </div>
                </div>

                {/* Switch User Helper */}
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Quick Switch Account (Demo)
                  </p>
                  <div className="space-y-1">
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={async () => {
                          await quickSwitchUser(u.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          u.id === currentUser?.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{u.fullName}</span>
                        <span className="text-[9px] font-semibold text-slate-400">{u.role === 'SUPER_ADMIN' ? 'Admin' : 'Staff'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 mt-1 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
