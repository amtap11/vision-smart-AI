
import React from 'react';
import { FileText, GitMerge, ArrowRight, Layers, Activity, Sparkles, Workflow } from 'lucide-react';

interface ModeSelectionProps {
  onSelectSingle: () => void;
  onSelectMulti: () => void;
}

const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelectSingle, onSelectMulti }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Select Analysis Studio</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Choose the environment that best fits your data complexity. You can switch studios later from the dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simple Studio Card */}
        <button 
          onClick={onSelectSingle}
          className="group relative bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-blue-500" size={24} />
          </div>
          
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Sparkles size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-3">Simple Studio</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            A guided, linear workflow for analyzing a single dataset. Perfect for generating quick insights, setting goals, and creating professional reports.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Automated Profiling</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Smart Goals</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Instant Dashboard</span>
          </div>
        </button>

        {/* Advanced Studio Card */}
        <button 
          onClick={onSelectMulti}
          className="group relative bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-indigo-500" size={24} />
          </div>

          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Workflow size={28} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-3">Advanced Studio</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            A flexible statistical workbench for multiple datasets. Perform complex joins, predictive modeling, and cross-file pattern detection.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Data Joining</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Regression & Clustering</span>
            <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100">Forecasting</span>
          </div>
        </button>
      </div>

      <div className="mt-12 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-xs font-medium">
             <Activity size={14} /> System Ready • Version 2.5.0
         </div>
      </div>
    </div>
  );
};

export default ModeSelection;
