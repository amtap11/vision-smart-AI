
import React, { useState, useRef, useEffect } from 'react';
import { ReportItem, ChartConfig, ReportHistoryItem, ReportReview } from '../types';
import { generateFinalReport, generateChartContextForReport, evaluateReportQuality } from '../services/geminiService';
import { 
  FileText, Trash2, Loader2, Download, ChevronRight, Settings2, Sparkles, CheckCircle2, 
  Filter, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, 
  History, Clock, FileSearch, PanelRightClose, PanelRightOpen, ArrowLeftCircle, Bot, ShieldCheck, X, XCircle, LogOut
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Treemap, ScatterChart, Scatter
} from 'recharts';

interface ReportGenProps {
  items: ReportItem[];
  onRemoveItem: (id: string) => void;
  history: ReportHistoryItem[];
  onSaveToHistory: (report: ReportHistoryItem) => void;
  onFinishSession: () => void;
  externalLoadItem: ReportHistoryItem | null;
}

declare const html2canvas: any;
declare const html2pdf: any;

const ReportGen: React.FC<ReportGenProps> = ({ items, onRemoveItem, history, onSaveToHistory, onFinishSession, externalLoadItem }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 'history'>(1); 
  const [context, setContext] = useState({
    audience: 'Executive Board',
    tone: 'Strategic and Data-Driven',
    notes: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [reportTitle, setReportTitle] = useState('Strategic Business Report');
  
  // Editor State
  const [htmlContent, setHtmlContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSelection = useRef<Range | null>(null);
  
  // Sidebar State
  const [showVisualSidebar, setShowVisualSidebar] = useState(true);

  // Agent State
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReportReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Auto-load history item if provided by parent (Layout)
  useEffect(() => {
    if (externalLoadItem) {
        handleLoadHistory(externalLoadItem);
    }
  }, [externalLoadItem]);

  // Initialize content when entering step 3
  useEffect(() => {
    if (step === 3 && editorRef.current) {
        // Ensure the DOM matches the initial state content
        if (editorRef.current.innerHTML !== htmlContent) {
            editorRef.current.innerHTML = htmlContent;
        }
    }
  }, [step, htmlContent]);

  // Reset Download state when entering editor
  useEffect(() => {
    if (step === 3) setHasDownloaded(false);
  }, [step]);

  // Track selection in the editor to insert images at the correct spot
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Ensure the selection is actually inside our editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        lastSelection.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
      const selection = window.getSelection();
      if (lastSelection.current && selection) {
          selection.removeAllRanges();
          selection.addRange(lastSelection.current);
          return true;
      }
      return false;
  };

  // Syncs the DOM content back to React State to prevent loss
  const syncContent = () => {
      if (editorRef.current) {
          setHtmlContent(editorRef.current.innerHTML);
      }
  };

  // Parse markdown to HTML (Simple converter for initial load)
  const parseMarkdown = (md: string) => {
    return md
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-slate-900 border-b-2 border-slate-100 pb-2 break-after-avoid">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-slate-800 break-after-avoid">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-slate-800 break-after-avoid">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1 text-slate-700 list-disc">$1</li>')
      .replace(/\n/gim, '<br />');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const rawText = await generateFinalReport(items, context);
      const html = parseMarkdown(rawText);
      setHtmlContent(html);
      setStep(3);
      
      // Save to history automatically on generation
      const newReport: ReportHistoryItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(),
          title: reportTitle,
          htmlContent: html,
          visuals: items.filter(i => i.type === 'chart')
      };
      onSaveToHistory(newReport);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadHistory = (item: ReportHistoryItem) => {
      setHtmlContent(item.htmlContent);
      setReportTitle(item.title);
      setStep(3);
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editorRef.current) {
          editorRef.current.focus();
      }
      syncContent();
  };

  const insertHtmlAtCursorOrEnd = (html: string) => {
    if (editorRef.current) {
        editorRef.current.focus();
        const restored = restoreSelection();
        
        if (restored) {
             // Valid cursor position found
             document.execCommand('insertHTML', false, html);
        } else {
             // No cursor position, append to end
             const cleanHtml = htmlContent.endsWith('<br>') ? htmlContent : htmlContent + '<br/>';
             editorRef.current.innerHTML = cleanHtml + html;
             
             // Scroll to bottom to show user
             editorRef.current.scrollTop = editorRef.current.scrollHeight;
        }
        syncContent();
    }
  };

  const handleSmartInsertChart = async (item: ReportItem) => {
    setInsertingId(item.id);
    
    // 1. Find the chart element in the sidebar
    const element = document.getElementById(`sidebar-chart-${item.id}`);
    if (!element) {
        setInsertingId(null);
        return;
    }

    try {
        // 2. Convert to high-res image
        const canvas = await html2canvas(element, { 
            scale: 2.5, // High resolution for print
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');

        // 3. Generate Smart Context using AI Agent
        const config = (item.content as any).config;
        const data = (item.content as any).data;
        const aiAnalysis = await generateChartContextForReport(config, data);

        // 4. Construct Image + Analysis Block
        // We use inline styles heavily here to ensure they persist in PDF generation
        const smartHtml = `
            <div class="chart-container" style="page-break-inside: avoid; margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="padding: 24px; background: white; text-align: center;">
                    <img src="${imgData}" alt="${item.title}" style="max-width: 100%; max-height: 400px; height: auto; display: inline-block;" />
                </div>
                <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 18px;">🤖</span>
                        <div>
                            <strong style="color: #4f46e5; display: block; margin-bottom: 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">AI Insight</strong>
                            <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6; font-style: italic;">
                                "${aiAnalysis}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <p><br/></p>
        `;

        // 5. Insert
        insertHtmlAtCursorOrEnd(smartHtml);
        
    } catch (error) {
        console.error("Failed to insert chart image", error);
        alert("Could not insert chart. Please try again.");
    } finally {
        setInsertingId(null);
    }
  };

  const handleQualityCheck = async () => {
      if (!editorRef.current) return;
      setIsReviewing(true);
      setShowReviewModal(true);
      
      try {
          // Scrape text content
          const content = editorRef.current.innerText;
          const review = await evaluateReportQuality(content);
          setReviewResult(review);
      } catch (error) {
          console.error("QA failed", error);
      } finally {
          setIsReviewing(false);
      }
  };

  const handleDownloadPDF = async () => {
      if (!editorRef.current) return;
      setIsDownloading(true);

      const opt = {
          margin: [15, 15, 15, 15], // Top, Left, Bottom, Right in mm
          filename: `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true,
              letterRendering: true,
              scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      try {
          await html2pdf().set(opt).from(editorRef.current).save();
          setHasDownloaded(true);
      } catch (err) {
          console.error("PDF Generation failed", err);
          alert("Failed to generate PDF. Please ensure all visuals are fully loaded.");
      } finally {
          setIsDownloading(false);
      }
  };

  const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6'];

  const CustomizeTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, name, value } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 40 && height > 20 && (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
            {name}
          </text>
        )}
      </g>
    );
  };

  const renderMiniChart = (item: ReportItem, small = false) => {
    const config = (item.content as any).config as ChartConfig;
    const data = (item.content as any).data;
    const filterContext = (item.content as any).filterContext;
    
    if(!config || !data) return null;

    if (config.type === 'kpi') {
        const val = data as number;
        return (
            <div id={`sidebar-chart-${item.id}`} className={`${small ? 'p-3' : 'p-6'} bg-slate-50 rounded-lg text-center border border-slate-200 mb-4`}>
                <h4 className="text-slate-500 font-medium mb-1 text-xs uppercase">{item.title}</h4>
                <div className={`${small ? 'text-xl' : 'text-3xl'} font-bold text-slate-800`}>{val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                {filterContext && !filterContext.includes('Full') && (
                    <div className="text-[10px] text-indigo-600 mt-1 bg-indigo-50 inline-block px-1 rounded">
                        {filterContext}
                    </div>
                )}
            </div>
        );
    }

    const chartData = data as any[];

    return (
        <div id={`sidebar-chart-${item.id}`} className={`w-full bg-white border border-slate-200 rounded-lg ${small ? 'h-[200px] p-2' : 'h-[300px] p-4'} mb-4 shadow-sm break-inside-avoid relative`}>
            <h4 className="text-xs font-bold text-slate-700 mb-2 text-center truncate">{item.title}</h4>
             {filterContext && !filterContext.includes('Full') && (
                <div className="text-[10px] text-center mb-1 text-slate-400">
                    <Filter size={8} className="inline mr-1" />{filterContext}
                </div>
             )}
            <ResponsiveContainer width="100%" height="85%">
                {config.type === 'bar' ? (
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                     <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} height={30} axisLine={false} tickLine={false}/>
                     <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                     <Tooltip wrapperStyle={{zIndex: 1000}}/>
                     <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : config.type === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                    <Tooltip wrapperStyle={{zIndex: 1000}}/>
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{r: 2}} />
                  </LineChart>
                ) : config.type === 'map' ? (
                   <Treemap
                    data={chartData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<CustomizeTreemapContent />}
                  >
                    <Tooltip wrapperStyle={{zIndex: 1000}}/>
                  </Treemap>
                ) : (config.type === 'scatter' || config.type === 'boxplot') ? (
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name={item.title} data={chartData} fill="#10b981" />
                  </ScatterChart>
                ) : (
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{zIndex: 1000}}/>
                    <Legend verticalAlign="bottom" height={20} iconSize={8} wrapperStyle={{fontSize: '9px'}}/>
                  </PieChart>
                )}
            </ResponsiveContainer>
        </div>
    );
  };

  // HISTORY VIEW
  if (step === 'history') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Report History</h2>
                    <p className="text-slate-500">Access previously generated strategic reports.</p>
                </div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-medium hover:underline flex items-center gap-1">
                    <ArrowLeftCircle size={18} /> Back to Builder
                </button>
              </div>

              {history.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Clock size={48} className="mx-auto mb-4 opacity-50"/>
                      <p>No reports generated yet.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {history.map((h) => (
                          <div key={h.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                      <FileText size={24} />
                                  </div>
                                  <span className="text-xs text-slate-400">{h.date}</span>
                              </div>
                              <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{h.title}</h3>
                              <p className="text-sm text-slate-500 mb-4 line-clamp-2">Contains {h.visuals.length} visuals.</p>
                              <button 
                                onClick={() => handleLoadHistory(h)}
                                className="w-full py-2 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-sm"
                              >
                                  View Report
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  }

  // 1. Review Cart Step
  if (step === 1) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
                <div className="inline-flex p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                    <FileText size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Report Builder</h2>
                <p className="text-slate-500">
                    Review your collected insights before generation.
                </p>
            </div>
            <button 
                onClick={() => setStep('history')} 
                className="absolute right-6 top-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600"
            >
                <History size={18} /> History
            </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
             <p className="text-slate-400">Your report cart is empty. Go back and add insights!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
            {items.map((item) => {
                const isFiltered = item.type === 'chart' && (item.content as any).filterContext && !(item.content as any).filterContext.includes('Full');
                return (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg ${
                           item.type === 'chart' ? 'bg-purple-100 text-purple-600' :
                           item.type === 'insight' ? 'bg-amber-100 text-amber-600' :
                           item.type === 'recommendation' ? 'bg-green-100 text-green-600' :
                           'bg-indigo-100 text-indigo-600'
                       }`}>
                           {item.type === 'chart' && <FileText size={20}/>}
                           {item.type === 'insight' && <Sparkles size={20}/>}
                           {item.type === 'recommendation' && <CheckCircle2 size={20}/>}
                           {(item.type === 'quality' || item.type === 'goal') && <Settings2 size={20}/>}
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{item.title}</h4>
                            {isFiltered && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                    <Filter size={8} /> Filtered
                                </span>
                            )}
                         </div>
                         <p className="text-xs text-slate-500 capitalize">{item.type} • Added {item.timestamp.toLocaleTimeString()}</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
            })}
          </div>
        )}

        <div className="flex justify-center pt-6">
           <button 
             onClick={() => setStep(2)}
             disabled={items.length === 0}
             className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
             Proceed to Context <ChevronRight size={20} />
           </button>
        </div>
      </div>
    );
  }

  // 2. Context Step
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
         <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Finalize Report Context</h2>
            <p className="text-slate-500 mt-1">Help the AI tailor the report to your specific needs.</p>
         </div>

         <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Report Title</label>
               <input 
                 type="text" 
                 value={reportTitle}
                 onChange={(e) => setReportTitle(e.target.value)}
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
               <input 
                 type="text" 
                 value={context.audience}
                 onChange={(e) => setContext({...context, audience: e.target.value})}
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Tone & Style</label>
               <select 
                 value={context.tone}
                 onChange={(e) => setContext({...context, tone: e.target.value})}
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
               >
                 <option>Strategic and Data-Driven</option>
                 <option>Persuasive and Action-Oriented</option>
                 <option>Technical and Detailed</option>
                 <option>Simple and Summary-Focused</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Specific Executive Notes</label>
               <textarea 
                 value={context.notes}
                 onChange={(e) => setContext({...context, notes: e.target.value})}
                 placeholder="e.g., Emphasize the need for budget increase in Q3..."
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
               />
            </div>
         </div>

         <div className="flex gap-4">
            <button 
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {isGenerating ? 'AI is Writing Report...' : 'Generate Professional Report'}
            </button>
         </div>
      </div>
    );
  }

  // 3. Final Result Step (Editor)
  const chartItems = items.filter(i => i.type === 'chart');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 relative">
       {/* Toolbar Header */}
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print sticky top-20 z-40">
          <div className="flex items-center gap-4">
             <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-700"><ChevronRight size={20} className="rotate-180"/></button>
             <div>
                <h2 className="text-lg font-bold text-slate-800">{reportTitle}</h2>
                <p className="text-xs text-slate-500">Editable Mode</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
             <ToolbarButton onClick={() => execCmd('bold')} icon={<Bold size={16}/>} />
             <ToolbarButton onClick={() => execCmd('italic')} icon={<Italic size={16}/>} />
             <ToolbarButton onClick={() => execCmd('underline')} icon={<Underline size={16}/>} />
             <div className="w-px h-6 bg-slate-300 mx-1"></div>
             <ToolbarButton onClick={() => execCmd('insertUnorderedList')} icon={<List size={16}/>} />
             <ToolbarButton onClick={() => execCmd('justifyLeft')} icon={<AlignLeft size={16}/>} />
             <ToolbarButton onClick={() => execCmd('justifyCenter')} icon={<AlignCenter size={16}/>} />
             <ToolbarButton onClick={() => execCmd('justifyRight')} icon={<AlignRight size={16}/>} />
             <div className="w-px h-6 bg-slate-300 mx-1"></div>
             <select onChange={(e) => execCmd('fontSize', e.target.value)} className="bg-transparent text-xs font-medium focus:outline-none">
                 <option value="3">Normal</option>
                 <option value="5">Large</option>
                 <option value="7">Huge</option>
             </select>
             <input type="color" onChange={(e) => execCmd('foreColor', e.target.value)} className="w-6 h-6 border-none cursor-pointer" />
          </div>

          <div className="flex gap-2">
             <button onClick={() => setShowVisualSidebar(!showVisualSidebar)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Toggle Visuals Sidebar">
                {showVisualSidebar ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}
             </button>
             
             <button 
                onClick={handleQualityCheck}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium transition-colors"
             >
                <ShieldCheck size={18} /> Review & Score
             </button>

             {hasDownloaded ? (
                 <button 
                    onClick={onFinishSession} 
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors animate-in fade-in"
                 >
                    <CheckCircle2 size={18} /> Finish Session
                 </button>
             ) : (
                <button 
                    onClick={handleDownloadPDF} 
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-colors"
                >
                {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
             )}
          </div>
       </div>

       <div className="flex gap-6">
           {/* Document Editor */}
           <div className={`transition-all duration-300 ${showVisualSidebar ? 'w-2/3' : 'w-full mx-auto max-w-5xl'}`}>
                <div 
                    className="bg-white p-12 rounded-xl shadow-md border border-slate-200 min-h-[1000px] print:shadow-none print:border-none print:p-0 print:w-full"
                    id="report-container"
                >
                    {/* Header */}
                    <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{reportTitle}</h1>
                            <p className="text-slate-500 mt-1">Generated by Vision Smart AI • {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-slate-800 text-sm">{context.audience}</div>
                            <div className="text-xs text-slate-400">Confidential</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div 
                        ref={editorRef}
                        className="prose prose-slate max-w-none focus:outline-none min-h-[500px]"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => { saveSelection(); syncContent(); }}
                        onMouseUp={saveSelection}
                        onKeyUp={saveSelection}
                        onBlur={syncContent}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    ></div>
                </div>
           </div>

           {/* Visual Sidebar */}
           {showVisualSidebar && chartItems.length > 0 && (
               <div className="w-1/3 space-y-4 no-print sticky top-40 h-fit max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2 sticky top-0 bg-slate-50 pb-2 z-10">
                       <FileSearch size={18} className="text-indigo-600"/> Visual Appendix
                   </h3>
                   {chartItems.map((item, idx) => (
                       <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                           {renderMiniChart(item, true)}
                           
                           {/* Hover Overlay for Insert */}
                           <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               {insertingId === item.id ? (
                                   <div className="flex items-center gap-2 text-indigo-600 font-bold bg-white px-4 py-2 rounded-full shadow-lg">
                                       <Loader2 className="animate-spin" size={16} /> Generating Smart Analysis...
                                   </div>
                               ) : (
                                   <button 
                                     onClick={() => handleSmartInsertChart(item)}
                                     className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-indigo-700 hover:scale-105 transition-all"
                                   >
                                       <Bot size={16} /> Smart Insert (Image + AI)
                                   </button>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
           )}
       </div>

       {/* Review Modal */}
       {showReviewModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                       <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <ShieldCheck size={24} className="text-amber-500" /> Quality Assurance Review
                       </h3>
                       <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-700">
                           <X size={24} />
                       </button>
                   </div>
                   
                   <div className="p-8 overflow-y-auto custom-scrollbar">
                       {isReviewing ? (
                           <div className="text-center py-12">
                               <Loader2 className="animate-spin text-amber-500 mx-auto mb-4" size={48} />
                               <h4 className="text-lg font-semibold text-slate-800">Lead Auditor is reviewing your report...</h4>
                               <p className="text-slate-500">Checking for clarity, data accuracy, and professional tone.</p>
                           </div>
                       ) : reviewResult ? (
                           <div className="space-y-6">
                               <div className="flex items-center gap-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                   <div className={`
                                       text-4xl font-bold p-4 rounded-xl flex-shrink-0
                                       ${reviewResult.score >= 80 ? 'text-green-600 bg-green-100' : reviewResult.score >= 60 ? 'text-amber-600 bg-white' : 'text-red-600 bg-red-100'}
                                   `}>
                                       {reviewResult.score}
                                       <span className="text-sm font-normal text-slate-500 block text-center mt-1">/100</span>
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-slate-800">Auditor's Note</h4>
                                       <p className="text-slate-700 italic">"{reviewResult.auditorNote}"</p>
                                   </div>
                               </div>

                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                   <div>
                                       <h5 className="font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle2 size={16}/> Strengths</h5>
                                       <ul className="space-y-1">
                                           {reviewResult.strengths.map((s, i) => (
                                               <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                   <span className="mt-1.5 w-1 h-1 bg-green-400 rounded-full flex-shrink-0"></span> 
                                                   <span>{s}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                                   <div>
                                       <h5 className="font-bold text-red-700 mb-2 flex items-center gap-2"><XCircle size={16}/> Weaknesses</h5>
                                       <ul className="space-y-1">
                                           {reviewResult.weaknesses.map((s, i) => (
                                               <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                   <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full flex-shrink-0"></span> 
                                                   <span>{s}</span>
                                               </li>
                                           ))}
                                       </ul>
                                   </div>
                               </div>

                               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                   <h5 className="font-bold text-indigo-700 mb-2 flex items-center gap-2"><Sparkles size={16}/> Suggested Improvements</h5>
                                   <ul className="space-y-2">
                                       {reviewResult.suggestions.map((s, i) => (
                                           <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                               <ArrowLeftCircle size={14} className="mt-0.5 text-indigo-400 rotate-180 flex-shrink-0" /> 
                                               <span>{s}</span>
                                           </li>
                                       ))}
                                   </ul>
                               </div>
                           </div>
                       ) : (
                           <div className="text-center text-slate-500">Review failed. Please try again.</div>
                       )}
                   </div>

                   <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
                       <button onClick={() => setShowReviewModal(false)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                           Close Review
                       </button>
                       {!isReviewing && reviewResult && reviewResult.score < 100 && (
                           <button onClick={() => setShowReviewModal(false)} className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
                               Make Edits
                           </button>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

const ToolbarButton = ({ onClick, icon }: { onClick: () => void, icon: React.ReactNode }) => (
    <button onClick={onClick} className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors">
        {icon}
    </button>
);

export default ReportGen;
