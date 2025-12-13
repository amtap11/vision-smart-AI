
import React, { useState } from 'react';
import { 
  LayoutDashboard, FileText, ClipboardList, Brain, Layers, LogOut, 
  FolderOpen, Database, Wand2, Network, HardDrive, Plus, MoreVertical, Trash2, Download
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
  children
}) => {
  const [showDrive, setShowDrive] = useState(true);

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
