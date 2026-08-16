import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FFCSILogo } from './FFCSILogo';
import { Building2, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, quickSwitchUser, allUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.message || 'Invalid username or password, or your account is disabled.');
    }
  };

  const handleQuickLogin = async (userId: string, userUsername: string) => {
    setUsername(userUsername);
    setPassword('••••••••');
    setErrorMsg('');
    setIsLoading(true);
    await quickSwitchUser(userId);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 antialiased text-slate-800 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <FFCSILogo size="xl" variant="stacked" textColor="dark" className="mx-auto" />
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md space-y-5">
          
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-700" /> Secure Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your username and password to access client workspaces and BIR filings.</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Username Input */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/15 text-xs font-mono font-medium transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/15 text-xs font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 active:from-red-900 active:to-rose-900 text-white font-bold rounded-xl shadow-md shadow-rose-700/20 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Demo Quick Switch Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u.id, u.username)}
                  className="p-2.5 bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
                >
                  <p className="font-bold text-slate-800 group-hover:text-rose-900 transition-colors">{u.fullName}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                    <span className="font-mono text-rose-700 font-medium">@{u.username}</span>
                    <span className="px-1.5 py-0.2 bg-white border border-slate-200 text-slate-600 rounded font-bold text-[9px] uppercase">
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-1">
              Passwords protected by PBKDF2 with SHA-256 and unique salts.
            </p>
          </div>

        </div>

        {/* System Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>FFCSI Encrypted Client & Compliance Portal</span>
        </div>

      </div>

    </div>
  );
};
