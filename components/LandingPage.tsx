
import React from 'react';
import { ArrowRight, Activity, Brain, Layers, GitMerge, ShieldCheck, BarChart3, ChevronRight, Zap, Target, Search, FileText, MessageCircle } from 'lucide-react';

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
            <Zap size={12} fill="currentColor" /> v4.0 Complete Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            The Complete OS for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Data-Driven Business</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            From raw upload to strategic answer. Use our <strong>AI Analyst Chat</strong> to query data, auto-clean messy files, generate live dashboards, and train advanced ML models—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onSignIn}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 hover:scale-105 transition-all shadow-xl shadow-indigo-200 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Start Free Session <ChevronRight size={20} />
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all w-full sm:w-auto">
              Watch Workflow
            </button>
          </div>
        </div>
      </section>

      {/* Stats/Trust Bar */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Questions Answered", value: "250k+" },
            { label: "Data Sources", value: "CSV/Excel" },
            { label: "Analysis Speed", value: "< 2s" },
            { label: "Security", value: "End-to-End" }
          ].map((stat, idx) => (
            <div key={idx}>
              <div className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition Grid (The Insight Pipeline) */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Your Intelligent Data Lifecycle</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Stop juggling multiple tools. We handle the entire journey from messy spreadsheet to boardroom strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1: Clean */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">1. Smart Ingestion</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Drag & drop any messy file. We automatically detect headers, clean null values, and unify formats so your data is analysis-ready instantly.
            </p>
          </div>

          {/* Feature 2: Chat */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">2. AI Analyst Chat</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Don't know SQL? Just ask. "Why did sales drop in Q3?" Our AI Analyst scans your data and gives you plain-text answers with evidence.
            </p>
          </div>

          {/* Feature 3: Visualize */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">3. Live Dashboards</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Monitor KPIs in real-time. The system auto-generates beautiful, interactive charts specific to your metrics (Sales, Churn, Growth).
            </p>
          </div>

          {/* Feature 4: Predict */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <Brain size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">4. ML Studio</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Train Random Forests & Decision Trees with one click to forecast future trends. See exactly how decisions are made with our Tree Visualizer.
            </p>
          </div>
        </div>
      </section>

      {/* Advanced Features (Consolidated) */}
      <section className="bg-slate-900 text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
              Advanced Intelligence
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Deep Dive with the Advanced Studio
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              For power users who need more. Correlate multiple files, run complex regressions, and visualize decision logic with our state-of-the-art tools.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Search className="text-indigo-400 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-white">Pattern Recognition</h4>
                  <p className="text-sm text-slate-400">Auto-detect anomalies and outliers.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="text-indigo-400 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-white">Goal Seeking</h4>
                  <p className="text-sm text-slate-400">Optimize inputs to hit targets.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitMerge className="text-indigo-400 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-white">Multi-File Merge</h4>
                  <p className="text-sm text-slate-400">Join datasets intelligently.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="text-indigo-400 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-white">Auto-Reporting</h4>
                  <p className="text-sm text-slate-400">One-click PDF output.</p>
                </div>
              </div>
            </div>

            <button
              onClick={onSignIn}
              className="px-8 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors"
            >
              Access Advanced Studio
            </button>
          </div>

          <div className="flex-1 relative">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              {/* Abstract UI representation of the "Complete" workflow */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                  <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><ShieldCheck size={16} /></div>
                  <div className="h-2 w-24 bg-slate-600 rounded"></div>
                  <div className="ml-auto text-xs text-emerald-400 font-bold">CLEAN</div>
                </div>
                <div className="flex justify-center"><div className="w-0.5 h-4 bg-slate-700"></div></div>
                <div className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                  <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"><MessageCircle size={16} /></div>
                  <div className="h-2 w-32 bg-slate-600 rounded"></div>
                  <div className="ml-auto text-xs text-blue-400 font-bold">INSIGHT</div>
                </div>
                <div className="flex justify-center"><div className="w-0.5 h-4 bg-slate-700"></div></div>
                <div className="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
                  <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center"><Brain size={16} /></div>
                  <div className="h-2 w-20 bg-slate-600 rounded"></div>
                  <div className="ml-auto text-xs text-purple-400 font-bold">PREDICT</div>
                </div>
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
