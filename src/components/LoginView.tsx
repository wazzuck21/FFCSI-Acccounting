import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, allUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password);
      setIsLoading(false);
      if (!success) {
        setErrorMsg('Invalid username or password, or your account is disabled.');
      }
    }, 300);
  };

  const handleQuickLogin = (userUsername: string, userPass: string = 'password123') => {
    setUsername(userUsername);
    setPassword(userPass);
    setErrorMsg('');
    login(userUsername, userPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 antialiased text-slate-100">
      
      {/* Background Subtle Decorative Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30">
            <Building2 className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">AFMS Portal</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Accounting Firm Management & Compliance System</p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" /> Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Enter your username and password to access client workspaces and BIR filings.</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Username Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs font-mono font-medium transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Quick Sign In Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u.username, u.password || 'password123')}
                  className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
                >
                  <p className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{u.fullName}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span className="font-mono text-indigo-400 font-medium">@{u.username}</span>
                    <span className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded font-bold text-[9px] uppercase">
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 text-center pt-1">
              Default password for demo accounts is <span className="font-mono text-slate-400">password123</span>
            </p>
          </div>

        </div>

        {/* System Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>AFMS Offline-First Encrypted Portal</span>
        </div>

      </div>

    </div>
  );
};
