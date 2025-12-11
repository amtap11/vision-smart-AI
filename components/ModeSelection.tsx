import React from 'react';
import { FileText, GitMerge, ArrowRight, Layers, Activity } from 'lucide-react';

interface ModeSelectionProps {
  onSelectSingle: () => void;
  onSelectMulti: () => void;
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelectSingle, onSelectMulti }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Select Analysis Mode</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Choose how you want to analyze your data. You can switch modes later from the dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Single File Card */}
        <button 
          onClick={onSelectSingle}
          className="group relative bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-blue-500" size={24} />
          </div>
          
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileText size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-3">Single File Intelligence</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Complete DIG Framework analysis (Description, Introspection, Goal Setting) for a single dataset.
            Ideal for monthly reporting, deep dives, and specific operational goals.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Quality Check</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">AI Goals</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Dashboard</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">PDF Report</span>
          </div>
        </button>

        {/* Multi File Card */}
        <button 
          onClick={onSelectMulti}
          className="group relative bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-indigo-500" size={24} />
          </div>

          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <GitMerge size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-3">Multi-File Analysis</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Advanced statistical workbench for comparing multiple datasets. Find correlations, 
            run regressions, and detect cross-file patterns using AI.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Correlation</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Linear Regression</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Pattern Scout</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Data Merging</span>
          </div>
        </button>
      </div>

      <div className="mt-12 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-medium">
             <Activity size={14} /> System Ready • Version 2.4.0
         </div>
      </div>
    </div>
  );
};

export default ModeSelection;
