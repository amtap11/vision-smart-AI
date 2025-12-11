
import React from 'react';
import { ArrowRight, Activity, Brain, Layers, GitMerge, ShieldCheck, BarChart3, ChevronRight, Zap } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900 leading-none">Vision Smart <span className="text-indigo-600">AI</span></h1>
          </div>
        </div>
        <button 
          onClick={onSignIn}
          className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-full hover:bg-indigo-600 transition-all hover:shadow-lg hover:shadow-indigo-200 flex items-center gap-2 text-sm"
        >
          Sign In to Platform <ArrowRight size={16} />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 max-w-7xl mx-auto px-6 text-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6">
            <Zap size={12} fill="currentColor" /> v2.4 Enterprise Edition Live
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            Turn Complex Data into <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Strategic Intelligence</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. Vision Smart AI uses advanced generative models to clean, analyze, and visualize your business data in seconds. 
            From raw CSV to boardroom-ready reports.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onSignIn}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Start Analysis Now <ChevronRight size={20} />
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all w-full sm:w-auto">
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Data Points Processed", value: "10M+" },
              { label: "Reports Generated", value: "50k+" },
              { label: "AI Accuracy Score", value: "99.8%" },
              { label: "Enterprise Security", value: "SOC2" }
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">The D.I.G. Framework</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Our proprietary process ensures no insight is missed. We take you from Description to Introspection to Goal Setting automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Activity size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">1. Auto-Description</h3>
            <p className="text-slate-500 leading-relaxed">
              Upload any CSV. Our AI instantly profiles column quality, detects outliers, and generates descriptive statistics without you writing a single line of code.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Brain size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">2. Deep Introspection</h3>
            <p className="text-slate-500 leading-relaxed">
              Don't know what to ask your data? Vision Smart AI generates the critical business questions for you and provides hypothesis-driven answers immediately.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
              <BarChart3 size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">3. Vision Boarding</h3>
            <p className="text-slate-500 leading-relaxed">
              Set a goal like "Increase Revenue" and watch as the system builds a custom dashboard with specific charts, KPIs, and a roadmap to achieve it.
            </p>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="bg-slate-900 text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
           <div className="flex-1">
              <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
                Advanced Analytics Studio
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                Go Beyond Simple Charts with Multi-File Intelligence
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Need to correlate marketing spend with sales revenue across different files? Our Multi-File Analysis engine handles complex joins, regressions, and K-Means clustering automatically.
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-300">
                  <GitMerge className="text-indigo-400" size={20} /> Smart Merge & Join Suggestions
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Activity className="text-indigo-400" size={20} /> Predictive Linear Regressions
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="text-indigo-400" size={20} /> Automated Data Cleaning
                </li>
              </ul>

              <button 
                onClick={onSignIn}
                className="px-8 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors"
              >
                Try Advanced Studio
              </button>
           </div>
           
           <div className="flex-1 relative">
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="space-y-4">
                      <div className="h-32 bg-slate-700/50 rounded-lg flex items-center justify-center border border-slate-600 border-dashed text-slate-500 text-sm">
                          Live Interactive Charting
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="h-24 bg-slate-700/50 rounded-lg"></div>
                          <div className="h-24 bg-slate-700/50 rounded-lg"></div>
                      </div>
                      <div className="h-8 w-2/3 bg-indigo-600/20 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-slate-700 rounded"></div>
                      <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
                  </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-100">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <Layers size={20} className="text-slate-400" />
               <span className="font-bold text-slate-700">Vision Smart AI</span>
            </div>
            <div className="text-slate-400 text-sm">
               &copy; {new Date().getFullYear()} Vision Smart AI. All rights reserved.
            </div>
            <div className="flex gap-6 text-slate-500 text-sm">
               <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
               <a href="#" className="hover:text-indigo-600">Terms of Service</a>
               <a href="#" className="hover:text-indigo-600">Contact Support</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
