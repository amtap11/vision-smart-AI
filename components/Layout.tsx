
import React, { useState, useRef, useEffect } from 'react';
import { Activity, Database, Search, Target, LayoutDashboard, FileText, ClipboardList, Brain, Layers, RotateCcw, LogOut, FolderOpen, ChevronDown, Clock, History, FileClock, Trash2, Save, Check, GitMerge, Home, ChevronLeft } from 'lucide-react';
import { AppStage, User, DraftSession, ReportHistoryItem } from '../types';

interface LayoutProps {
  currentStage: AppStage;
  cartItemCount: number;
  onGoToReport: () => void;
  onStageChange: (stage: AppStage) => void;
  onNewAnalysis: () => void;
  onSaveDraft: () => void;
  lastSaved: Date | null;
  onLogout: () => void;
  user: User | null;
  drafts: DraftSession[];
  history: ReportHistoryItem[];
  onRestoreDraft: (draft: DraftSession) => void;
  onLoadHistory: (item: ReportHistoryItem) => void;
  onDeleteDraft: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onSwitchMode: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  currentStage, 
  cartItemCount, 
  onGoToReport, 
  onStageChange, 
  onNewAnalysis,
  onSaveDraft,
  lastSaved,
  onLogout, 
  user, 
  children,
  drafts,
  history,
  onRestoreDraft,
  onLoadHistory,
  onDeleteDraft,
  onDeleteHistory,
  onSwitchMode,
  onBack
}) => {
  const [showDrafts, setShowDrafts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const draftDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  const isModeSelection = currentStage === AppStage.MODE_SELECTION;
  const isMultiFile = currentStage === AppStage.MULTI_ANALYSIS;
  const isSingleFile = !isModeSelection && !isMultiFile;

  // Trigger visual confirmation when lastSaved updates
  useEffect(() => {
    if (lastSaved) {
        setShowSaveConfirm(true);
        const timer = setTimeout(() => setShowSaveConfirm(false), 2000);
        return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (draftDropdownRef.current && !draftDropdownRef.current.contains(event.target as Node)) {
        setShowDrafts(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const steps = [
    { id: AppStage.UPLOAD, label: 'Data Source', icon: Database },
    { id: AppStage.ANALYSIS, label: 'Introspection', icon: Search },
    { id: AppStage.GOALS, label: 'Goal Setting', icon: Target },
    { id: AppStage.DASHBOARD, label: 'Vision Board', icon: LayoutDashboard },
    { id: AppStage.REPORT, label: 'Final Report', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {onBack && !isModeSelection && (
                <button 
                    onClick={onBack}
                    className="p-2 mr-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Back"
                >
                    <ChevronLeft size={22} />
                </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg cursor-pointer" onClick={onSwitchMode}>
              <Layers size={22} />
            </div>
            <div>
                <h1 className="font-bold text-xl tracking-tight text-slate-900 leading-none cursor-pointer" onClick={onSwitchMode}>Vision Smart <span className="text-indigo-600">AI</span></h1>
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Intelligent Data Analysis</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 mr-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {user.name}
              </div>
            )}

            {/* History Dropdown */}
            <div className="relative" ref={historyDropdownRef}>
                <button 
                    onClick={() => { setShowHistory(!showHistory); setShowDrafts(false); }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    title="Report History"
                >
                    <History size={20} />
                </button>
                
                {showHistory && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <FileClock size={12} /> Past Reports
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs">No history available.</div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="flex items-center border-b border-slate-50 last:border-0 hover:bg-indigo-50 transition-colors group">
                                        <button
                                            onClick={() => { onLoadHistory(item); setShowHistory(false); }}
                                            className="flex-1 text-left p-3 overflow-hidden"
                                        >
                                            <div className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate">
                                                {item.title}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {item.date}
                                            </div>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteHistory(item.id); }}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 mr-2 rounded-lg transition-colors"
                                            title="Delete from History"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Drafts Dropdown (Only show in single file mode) */}
            {isSingleFile && (
                <div className="relative" ref={draftDropdownRef}>
                    <button 
                        onClick={() => { setShowDrafts(!showDrafts); setShowHistory(false); }}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${drafts.length > 0 ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        title="Saved Drafts"
                    >
                        <FolderOpen size={20} />
                        {drafts.length > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
                        )}
                    </button>
                    
                    {showDrafts && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <RotateCcw size={12} /> Recent Drafts (Last 3)
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {drafts.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-xs">No drafts saved.</div>
                                ) : (
                                    drafts.map((draft) => (
                                        <div key={draft.id} className="flex items-center border-b border-slate-50 last:border-0 hover:bg-amber-50 transition-colors group">
                                            <button
                                                onClick={() => { onRestoreDraft(draft); setShowDrafts(false); }}
                                                className="flex-1 text-left p-3 overflow-hidden"
                                            >
                                                <div className="text-sm font-medium text-slate-800 group-hover:text-amber-700 truncate">
                                                    {draft.selectedGoal || "Untitled Analysis"}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 flex justify-between">
                                                    <span>{draft.stage}</span>
                                                    <span>{draft.timestamp.split(',')[0]}</span>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteDraft(draft.id); }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 mr-2 rounded-lg transition-colors"
                                                title="Delete Draft"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Manual Save Button - Only Single File */}
            {isSingleFile && (
                <button 
                onClick={onSaveDraft}
                className="px-3 py-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium relative"
                title="Save current progress as draft"
                >
                {showSaveConfirm ? <Check size={18} className="text-emerald-500" /> : <Save size={18} />}
                <span className="hidden sm:inline">{showSaveConfirm ? "Saved" : "Save"}</span>
                </button>
            )}

            {!isModeSelection && (
                <button 
                  onClick={onSwitchMode}
                  className="px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Switch Mode"
                >
                  <Home size={18} />
                  <span className="hidden sm:inline">Modes</span>
                </button>
            )}

            {/* Reset Button - Always visible except Mode Selection */}
            {!isModeSelection && (
                <button 
                onClick={onNewAnalysis}
                className="px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Start New Analysis (Saves current as draft)"
                >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Reset</span>
                </button>
            )}

            {/* Global Report Cart - Always visible if items exist, or if in valid analysis mode */}
            {(!isModeSelection || cartItemCount > 0) && (
                <button 
                onClick={onGoToReport}
                className={`
                    relative px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border
                    ${currentStage === AppStage.REPORT 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
                `}
                >
                <ClipboardList size={18} />
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-in zoom-in border-2 border-white">
                    {cartItemCount}
                    </span>
                )}
                </button>
            )}
            
            <button 
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar (DIG Framework) - Only visible in Single File Mode */}
      {isSingleFile && (
        <div className="bg-white border-b border-slate-200 py-6 shadow-sm no-print animate-in fade-in slide-in-from-top-2">
            <div className="max-w-5xl mx-auto px-6">
            <div className="flex justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                
                {steps.map((step, index) => {
                const isActive = step.id === currentStage;
                const isPast = steps.findIndex(s => s.id === currentStage) > index;
                const isClickable = true; // Allow navigation to any step for flexibility
                
                return (
                    <button 
                    key={step.id} 
                    onClick={() => isClickable && onStageChange(step.id)}
                    className={`flex flex-col items-center gap-3 cursor-pointer group outline-none focus:scale-105 transition-transform`}
                    >
                    <div 
                        className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 z-10
                        ${isActive 
                            ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg shadow-indigo-200 scale-110' 
                            : isPast 
                                ? 'bg-indigo-600 border-white text-white' 
                                : 'bg-white border-slate-100 text-slate-300 group-hover:border-indigo-200 group-hover:text-indigo-300'}
                        `}
                    >
                        <step.icon size={16} />
                    </div>
                    <span className={`text-xs font-bold tracking-wide transition-colors ${isActive ? 'text-indigo-600' : isPast ? 'text-slate-600' : 'text-slate-300'}`}>
                        {step.label}
                    </span>
                    </button>
                );
                })}
            </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 print:p-0 print:max-w-none">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-sm text-slate-400 no-print">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Brain size={16} className="text-slate-300"/>
            <span className="font-semibold text-slate-500">Vision Smart AI</span>
        </div>
        &copy; {new Date().getFullYear()} Enterprise Edition. Secure Data Processing.
      </footer>
    </div>
  );
};

export default Layout;
