import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, Layers } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulated API call delay
    setTimeout(() => {
      if (email === 'mohammed.alnjjar.ma@gmail.com' && password === 'M#trimed33') {
        onLogin({ email, name: 'Mohammed Alnjjar' });
      } else {
        setError('Invalid credentials. Please check your email and password.');
        setLoading(false);
      }
    }, 1000);
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
                   type="password" 
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                   placeholder="••••••••"
                 />
               </div>
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
               {loading ? 'Authenticating...' : 'Sign In'}
             </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-400">
             Protected by Enterprise Security Standards
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
