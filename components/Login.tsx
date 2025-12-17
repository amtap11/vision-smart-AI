import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, Layers, UserPlus, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { apiClient } from '../services/apiClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const response = await apiClient.register({ email, password, name });
        onLogin({
          email: response.user.email,
          name: response.user.name,
        });
      } else {
        const response = await apiClient.login({ email, password });
        onLogin({
          email: response.user.email,
          name: response.user.name,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-lg mb-4">
                <Layers size={32} />
             </div>
             <h1 className="text-2xl font-bold text-white mb-1">Vision Smart AI</h1>
             <p className="text-indigo-100 text-sm">Enterprise Intelligence Platform</p>
          </div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
             {isRegistering && (
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                 <div className="relative">
                   <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input
                     type="text"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                     placeholder="John Doe"
                   />
                 </div>
               </div>
             )}

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input
                   type="email"
                   required
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                   placeholder="name@company.com"
                 />
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input
                   type={showPassword ? "text" : "password"}
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                   placeholder="••••••••"
                   minLength={8}
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
                   aria-label={showPassword ? "Hide password" : "Show password"}
                 >
                   {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
               {isRegistering && (
                 <p className="mt-1 text-xs text-slate-500">Password must be at least 8 characters</p>
               )}
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                 <span className="block w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                 {error}
               </div>
             )}

             <button
               type="submit"
               disabled={loading}
               className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
             >
               {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
               {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
             </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-slate-400">
             Protected by Enterprise Security Standards
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
