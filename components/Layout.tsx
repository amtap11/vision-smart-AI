
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FileText, ClipboardList, Brain, Layers, LogOut, 
  FolderOpen, Database, Wand2, Network, HardDrive, Plus, MoreVertical, Trash2, Download,
  History, FileEdit, RotateCcw, Download as DownloadIcon
} from 'lucide-react';
import { AppStage, User, Dataset } from '../types';
import { exportToCSV } from '../services/dataService';

interface LayoutProps {
  currentStage: AppStage;
  cartItemCount: number;
  onNavigate: (stage: AppStage) => void;
  onLogout: () => void;
  user: User | null;
  datasets: Dataset[];
  activeDatasetId: string | null;
  onSetActiveDataset: (id: string) => void;
  onDeleteDataset: (id: string) => void;
  onUploadClick: () => void; // Trigger file upload from sidebar
  children: React.ReactNode;
  onHistoryClick?: () => void;
  onDraftClick?: () => void;
  onResetClick?: () => void;
  historyCount?: number;
  hasDraft?: boolean;
  reportHistory?: any[];
  reportDraft?: any;
  onLoadHistoryItem?: (item: any) => void;
  onLoadDraft?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  currentStage, 
  cartItemCount, 
  onNavigate, 
  onLogout, 
  user,
  datasets,
  activeDatasetId,
  onSetActiveDataset,
  onDeleteDataset,
  onUploadClick,
  children,
  onHistoryClick,
  onDraftClick,
  onResetClick,
  historyCount = 0,
  hasDraft = false,
  reportHistory = [],
  reportDraft = null,
  onLoadHistoryItem,
  onLoadDraft
}) => {
  const [showDrive, setShowDrive] = useState(true);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);
  const [showDraftMenu, setShowDraftMenu] = useState(false);
  const historyMenuRef = useRef<HTMLDivElement>(null);
  const draftMenuRef = useRef<HTMLDivElement>(null);
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target as Node)) {
        setShowHistoryMenu(false);
      }
      if (draftMenuRef.current && !draftMenuRef.current.contains(event.target as Node)) {
        setShowDraftMenu(false);
      }
    };
    
    if (showHistoryMenu || showDraftMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryMenu, showDraftMenu]);

  // Navigation Items
  const navItems = [
    { id: AppStage.DATA_STUDIO, label: 'Data Studio', icon: Database },
    { id: AppStage.SMART_ANALYSIS, label: 'Smart Analysis', icon: Wand2 },
    { id: AppStage.DEEP_DIVE, label: 'Deep Dive', icon: Network },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans overflow-hidden">
      
      {/* LEFT: Data Drive Sidebar */}
      <aside 
        className={`bg-slate-900 text-white flex-shrink-0 transition-all duration-300 flex flex-col ${showDrive ? 'w-64' : 'w-16'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
           {showDrive ? (
             <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
               <Layers className="text-indigo-400" /> Vision AI
             </div>
           ) : (
             <Layers className="text-indigo-400 mx-auto" />
           )}
           <button onClick={() => setShowDrive(!showDrive)} className="text-slate-500 hover:text-white transition-colors">
             <HardDrive size={18} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
           {showDrive && <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Data Drive</h3>}
           
           <button 
             onClick={onUploadClick}
             className={`w-full mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 ${showDrive ? 'py-2 px-4' : 'p-2 aspect-square'}`}
             title="Upload New Data"
           >
             <Plus size={18} />
             {showDrive && <span className="font-medium text-sm">Upload Data</span>}
           </button>

           <div className="space-y-1">
             {datasets.map((ds) => (
               <div 
                 key={ds.id} 
                 className={`group relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${activeDatasetId === ds.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                 onClick={() => onSetActiveDataset(ds.id)}
               >
                 <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase text-slate-300">
                    CSV
                 </div>
                 {showDrive && (
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-medium truncate">{ds.name}</div>
                     <div className="text-[10px] text-slate-500">{ds.data.length} rows</div>
                   </div>
                 )}
                 
                 {/* Hover Actions */}
                 {showDrive && (
                   <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); exportToCSV(ds.data, ds.name); }} className="p-1 hover:text-blue-400" title="Download">
                        <Download size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteDataset(ds.id); }} className="p-1 hover:text-red-400" title="Delete">
                        <Trash2 size={14} />
                      </button>
                   </div>
                 )}
               </div>
             ))}
             {datasets.length === 0 && showDrive && (
               <div className="text-center py-8 text-slate-600 text-xs italic">
                 Drive is empty.<br/>Upload files to begin.
               </div>
             )}
           </div>
        </div>

        <div className="p-4 border-t border-slate-800">
           {user && showDrive ? (
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                 {user.name.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="text-sm font-medium truncate">{user.name}</div>
                 <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
               </div>
               <button onClick={onLogout} className="text-slate-500 hover:text-white">
                 <LogOut size={16} />
               </button>
             </div>
           ) : (
             <button onClick={onLogout} className="w-full flex justify-center text-slate-500 hover:text-white">
               <LogOut size={20} />
             </button>
           )}
        </div>
      </aside>

      {/* RIGHT: Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-40">
           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  disabled={datasets.length === 0}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${currentStage === item.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 disabled:opacity-50 disabled:cursor-not-allowed'}
                  `}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
           </div>

           <div className="flex items-center gap-3">
              {/* History, Draft, and Reset buttons - always available when logged in */}
              {user && (
                <>
                  {onHistoryClick && (
                    <div className="relative" ref={historyMenuRef}>
                      <button 
                        onClick={() => setShowHistoryMenu(!showHistoryMenu)}
                        className="relative px-3 py-2 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        title="View Report History"
                      >
                        <History size={18} />
                        <span className="hidden sm:inline">History</span>
                        {historyCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-in zoom-in border-2 border-white">
                            {historyCount}
                          </span>
                        )}
                      </button>
                      {showHistoryMenu && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                          <div className="p-3 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Report History</h3>
                            <p className="text-xs text-slate-500">Select a report to view or download</p>
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {reportHistory && reportHistory.length > 0 ? (
                              reportHistory.map((item) => (
                                <div
                                  key={item.id}
                                  className="border-b border-slate-100 last:border-b-0"
                                >
                                  <button
                                    onClick={() => {
                                      if (onLoadHistoryItem) {
                                        onLoadHistoryItem(item);
                                        setShowHistoryMenu(false);
                                      }
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-start gap-3 transition-colors"
                                  >
                                    <FileText size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{item.title}</div>
                                      <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                                      <div className="text-xs text-slate-400 mt-1">{item.visuals?.length || 0} visuals</div>
                                    </div>
                                  </button>
                                  <div className="px-4 pb-2 flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Trigger download
                                        const handler = (window as any).__reportDownloadHistoryItem;
                                        if (handler) handler(item);
                                        setShowHistoryMenu(false);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <DownloadIcon size={12} />
                                      Download PDF
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                <History size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No reports generated yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {onDraftClick && (
                    <div className="relative" ref={draftMenuRef}>
                      <button 
                        onClick={() => setShowDraftMenu(!showDraftMenu)}
                        className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border ${
                          hasDraft 
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        title={hasDraft ? "Continue Draft" : "Save Draft"}
                      >
                        <FileEdit size={18} />
                        <span className="hidden sm:inline">{hasDraft ? 'Draft' : 'Save Draft'}</span>
                      </button>
                      {showDraftMenu && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                          <div className="p-3 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Draft Reports</h3>
                            <p className="text-xs text-slate-500">Continue working on saved drafts</p>
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {reportDraft && reportDraft.items && reportDraft.items.length > 0 ? (
                              <button
                                onClick={() => {
                                  if (onLoadDraft) {
                                    onLoadDraft();
                                    setShowDraftMenu(false);
                                  }
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-start gap-3 transition-colors"
                              >
                                <FileEdit size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{reportDraft.title || 'Draft Report'}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {reportDraft.items.length} items • Saved {reportDraft.savedAt ? new Date(reportDraft.savedAt).toLocaleString() : 'recently'}
                                  </div>
                                  <div className="text-xs text-amber-600 mt-1 font-medium">Click to continue →</div>
                                </div>
                              </button>
                            ) : (
                              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                <FileEdit size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No draft available</p>
                                <p className="text-xs mt-1">Your work will be auto-saved as you go</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {onResetClick && (
                    <button 
                      onClick={onResetClick}
                      className="px-3 py-2 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                      title="Reset Report"
                    >
                      <RotateCcw size={18} />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  )}
                </>
              )}
              
              <button 
                onClick={() => onNavigate(AppStage.REPORT)}
                className={`
                    relative px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border
                    ${currentStage === AppStage.REPORT 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
                `}
                >
                <ClipboardList size={18} />
                <span className="hidden sm:inline">Report Cart</span>
                {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-in zoom-in border-2 border-white">
                    {cartItemCount}
                    </span>
                )}
              </button>
           </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
           {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;
