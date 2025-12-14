
import React, { useState, useRef, useEffect } from 'react';
import { ReportItem, ChartConfig, ReportHistoryItem, ReportReview } from '../types';
import { generateFinalReport, generateChartContextForReport, evaluateReportQuality, suggestRelevantChart } from '../services/geminiService';
import { 
  FileText, Trash2, Loader2, Download, ChevronRight, Settings2, Sparkles, CheckCircle2, 
  Filter, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, 
  History, Clock, FileSearch, PanelRightClose, PanelRightOpen, ArrowLeftCircle, Bot, ShieldCheck, X, XCircle, LogOut,
  Share2, Mail, MessageCircle, PlusCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Treemap, ScatterChart, Scatter, LabelList
} from 'recharts';

interface ReportGenProps {
  items: ReportItem[];
  onRemoveItem: (id: string) => void;
  history: ReportHistoryItem[];
  onSaveToHistory: (report: ReportHistoryItem) => void;
  onFinishSession: () => void;
  externalLoadItem: ReportHistoryItem | null;
  sidebarExpanded?: boolean; // Whether the left sidebar is expanded
  onHistoryClick?: () => void;
  onDraftSave?: () => void;
  onDraftLoad?: () => void;
  onReset?: () => void;
}

declare const html2canvas: any;
declare const html2pdf: any;

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6'];

// Stable constants for Recharts to prevent ref thrashing
const TOOLTIP_WRAPPER_STYLE = { zIndex: 1000 };
const AXIS_TICK_STYLE = { fontSize: 9 };
const LEGEND_WRAPPER_STYLE = { fontSize: '9px' };
const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };
const BAR_MARGIN = { top: 10, right: 10, bottom: 20, left: 0 }; 

// Custom Treemap Content
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

// Custom Vertical Label for Bar Charts
const CustomVerticalLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value || height < 15) return null;
  
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  const midX = x + width / 2;
  const midY = y + height / 2;
  
  // Calculate responsive font size based on bar dimensions
  // Use the smaller dimension (width or height) to determine font size
  // This ensures labels fit well in both narrow and wide bars
  const barSize = Math.min(width, height);
  let fontSize = 8; // Minimum size
  
  if (barSize > 100) {
    fontSize = 14; // Large bars
  } else if (barSize > 60) {
    fontSize = 12; // Medium bars
  } else if (barSize > 40) {
    fontSize = 10; // Small-medium bars
  } else if (barSize > 25) {
    fontSize = 9; // Small bars
  } else {
    fontSize = 8; // Very small bars
  }
  
  // Also consider the value length - longer numbers might need smaller font
  const valueLength = formattedValue.toString().length;
  if (valueLength > 8 && fontSize > 10) {
    fontSize = Math.max(9, fontSize - 2);
  } else if (valueLength > 6 && fontSize > 11) {
    fontSize = Math.max(10, fontSize - 1);
  }
  
  return (
    <text
      x={midX}
      y={midY}
      textAnchor="middle"
      fill="#ffffff"
      fontSize={fontSize}
      fontWeight="bold"
      transform={`rotate(-90 ${midX} ${midY})`}
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {formattedValue}
    </text>
  );
};

// Custom XAxis Tick with Multi-line Support and Vertical Text for Many Bars
const CustomXAxisTick = (props: any) => {
  const { x, y, payload, index, visibleTicksCount, chartData, colors } = props;
  const text = payload.value || '';
  
  // Estimate available width based on typical chart dimensions
  // Assume average chart width of ~600px, divide by number of ticks
  const estimatedChartWidth = 600;
  const tickCount = visibleTicksCount || (chartData?.length || 10);
  const estimatedWidthPerTick = estimatedChartWidth / tickCount;
  
  // Get the bar color for this tick (if available)
  const barColor = colors && colors[index % colors.length] ? colors[index % colors.length] : '#64748b';
  
  // If more than 6 bars, use vertical text with bar color
  if (tickCount > 6) {
    const fontSize = estimatedWidthPerTick < 40 ? 8 : 9;
    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill={barColor}
        fontSize={fontSize}
        fontWeight={600}
        transform={`rotate(-90 ${x} ${y + 16})`}
      >
        {text}
      </text>
    );
  }
  
  // Calculate responsive font size based on estimated available width
  let fontSize = 9;
  if (estimatedWidthPerTick > 80) {
    fontSize = 11;
  } else if (estimatedWidthPerTick > 60) {
    fontSize = 10;
  } else if (estimatedWidthPerTick < 40) {
    fontSize = 8;
  } else {
    fontSize = 9;
  }
  
  // Split text into words
  const words = text.split(' ');
  
  // Determine if we need two lines based on text length and available space
  // Rough estimate: each character is ~0.6 * fontSize in width
  const estimatedTextWidth = text.length * fontSize * 0.6;
  const needsTwoLines = estimatedTextWidth > estimatedWidthPerTick * 0.9 || words.length > 2;
  
  // If text is short or only one word and fits, display on single line
  if (!needsTwoLines && (words.length <= 1 || text.length <= 15)) {
    return (
      <text
        x={x}
        y={y}
        dy={16}
        textAnchor="middle"
        fill="#64748b"
        fontSize={fontSize}
        fontWeight={500}
      >
        {text}
      </text>
    );
  }
  
  // Split into two lines - try to balance the length
  let line1 = '';
  let line2 = '';
  
  // If we have 2 words, split evenly
  if (words.length === 2) {
    line1 = words[0];
    line2 = words[1];
  } else if (words.length > 2) {
    // Split at midpoint for better balance
    const midPoint = Math.ceil(words.length / 2);
    line1 = words.slice(0, midPoint).join(' ');
    line2 = words.slice(midPoint).join(' ');
  } else {
    // Single long word - try to break it if possible (for very long single words)
    if (text.length > 20) {
      const midPoint = Math.ceil(text.length / 2);
      // Try to break at a space or hyphen if available
      const breakPoint = text.lastIndexOf(' ', midPoint) || text.lastIndexOf('-', midPoint) || midPoint;
      line1 = text.substring(0, breakPoint);
      line2 = text.substring(breakPoint).trim();
    } else {
      line1 = text;
    }
  }
  
  // Adjust font size for two-line labels if space is tight
  if (needsTwoLines && estimatedWidthPerTick < 50) {
    fontSize = Math.max(8, fontSize - 1);
  }
  
  return (
    <g>
      <text
        x={x}
        y={y}
        dy={8}
        textAnchor="middle"
        fill="#64748b"
        fontSize={fontSize}
        fontWeight={500}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x={x}
          y={y}
          dy={20}
          textAnchor="middle"
          fill="#64748b"
          fontSize={fontSize}
          fontWeight={500}
        >
          {line2}
        </text>
      )}
    </g>
  );
};

// Extracted MiniChart Component
const MiniChart: React.FC<{ item: ReportItem, small?: boolean, onInsert?: (id: string) => void, insertingId?: string | null }> = React.memo(({ item, small = false, onInsert, insertingId }) => {
    const config = (item.content as any).config as ChartConfig;
    const data = (item.content as any).data;
    const filterContext = (item.content as any).filterContext;
    
    if(!config || !data) return null;

    if (config.type === 'kpi') {
        const val = data as number;
        return (
            <div 
                id={`sidebar-chart-${item.id}`} 
                className={`${small ? 'p-3' : 'p-6'} bg-slate-50 rounded-lg text-center border border-slate-200 mb-4`}
            >
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
        <div 
            id={`sidebar-chart-${item.id}`} 
            className={`bg-white border border-slate-200 rounded-lg ${small ? 'h-[200px] p-2' : 'h-[300px] p-4'} mb-4 shadow-sm break-inside-avoid relative group cursor-grab active:cursor-grabbing`}
            draggable={true}
            onDragStart={(e) => {
                e.dataTransfer.setData('application/vision-item-id', item.id);
                e.dataTransfer.effectAllowed = 'copy';
            }}
        >
            <h4 className="text-sm font-bold text-slate-800 mb-3 text-center" style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>{item.title}</h4>
             {filterContext && !filterContext.includes('Full') && (
                <div className="text-[10px] text-center mb-1 text-slate-400">
                    <Filter size={8} className="inline mr-1" />{filterContext}
                </div>
             )}
            <div style={{ width: '100%', height: '85%', padding: config.type === 'pie' ? '10px' : '0' }}>
            {/* Added key to ResponsiveContainer to force remount on type change, avoiding ref null error */}
            <ResponsiveContainer width="100%" height="100%" key={`${item.id}-${config.type}`}>
                {config.type === 'bar' ? (
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                     <XAxis 
                       dataKey="name" 
                       tick={<CustomXAxisTick chartData={chartData} colors={COLORS} />} 
                       interval={0} 
                       height={chartData.length > 6 ? 80 : 50} 
                       axisLine={false} 
                       tickLine={false}
                     />
                     <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                     <Tooltip wrapperStyle={TOOLTIP_WRAPPER_STYLE}/>
                     <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                       <LabelList 
                         dataKey="value" 
                         content={<CustomVerticalLabel />}
                       />
                     </Bar>
                  </BarChart>
                ) : config.type === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                    <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                    <Tooltip wrapperStyle={TOOLTIP_WRAPPER_STYLE}/>
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}}>
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        style={{ 
                          fontSize: '12px', 
                          fill: '#8b5cf6', 
                          fontWeight: 'bold',
                          textShadow: '0 0 3px rgba(255,255,255,0.8), 0 0 3px rgba(255,255,255,0.8)'
                        }} 
                        formatter={(value: any) => value?.toLocaleString?.() || value}
                      />
                    </Line>
                  </LineChart>
                ) : config.type === 'map' ? (
                   <Treemap
                    data={chartData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<CustomizeTreemapContent />}
                  >
                    <Tooltip wrapperStyle={TOOLTIP_WRAPPER_STYLE}/>
                  </Treemap>
                ) : (config.type === 'scatter' || config.type === 'boxplot') ? (
                  <ScatterChart margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name={item.title} data={chartData}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Scatter>
                  </ScatterChart>
                ) : (
                  <PieChart margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                    <Pie 
                      data={chartData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={small ? 25 : 30} 
                      outerRadius={small ? 40 : 50} 
                      paddingAngle={5} 
                      dataKey="value"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        // Format value with full precision
                        const formattedValue = typeof value === 'number' 
                          ? value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
                          : value;
                        
                        // Truncate name if too long, but keep value full
                        const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="#1e293b" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize={small ? 8 : 9}
                            fontWeight="bold"
                            style={{ textShadow: '0 0 3px rgba(255,255,255,0.8)' }}
                          >
                            {displayName}: {formattedValue}
                          </text>
                        );
                      }}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      wrapperStyle={TOOLTIP_WRAPPER_STYLE} 
                      formatter={(value: any, name: any) => [
                        typeof value === 'number' 
                          ? value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
                          : value,
                        name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={60} 
                      iconSize={10} 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                      formatter={(value: string) => {
                        // Find the full value for this legend item
                        const entry = chartData.find((d: any) => d.name === value);
                        if (entry) {
                          const formattedValue = typeof entry.value === 'number'
                            ? entry.value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
                            : entry.value;
                          return `${value}: ${formattedValue}`;
                        }
                        return value;
                      }}
                    />
                  </PieChart>
                )}
            </ResponsiveContainer>
            </div>

            {/* Hover Overlay for Insert */}
            {onInsert && (
                <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    {insertingId === item.id ? (
                        <div className="flex items-center gap-2 text-indigo-600 font-bold bg-white px-4 py-2 rounded-full shadow-lg">
                            <Loader2 className="animate-spin" size={16} /> Generating Smart Analysis...
                        </div>
                    ) : (
                        <button 
                            onClick={() => onInsert(item.id)}
                            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-indigo-700 hover:scale-105 transition-all"
                        >
                            <Bot size={16} /> Smart Insert
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});
MiniChart.displayName = 'MiniChart';

const ReportGen: React.FC<ReportGenProps> = ({ items, onRemoveItem, history, onSaveToHistory, onFinishSession, externalLoadItem, onHistoryClick, onDraftSave, onDraftLoad, onReset }) => {
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

  // AI Insert Visual State
  const [aiSuggestion, setAiSuggestion] = useState<{ chartId: string, reasoning: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Share State
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Sidebar state detection
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  useEffect(() => {
    // Detect sidebar state by checking the sidebar width
    const checkSidebar = () => {
      const sidebar = document.querySelector('aside.bg-slate-900');
      if (sidebar) {
        const width = sidebar.getBoundingClientRect().width;
        setSidebarExpanded(width > 100); // If width > 100px, it's expanded (w-64 = 256px)
      }
    };
    
    // Check initially
    checkSidebar();
    
    // Watch for changes using MutationObserver
    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('aside.bg-slate-900');
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    // Also check on resize
    window.addEventListener('resize', checkSidebar);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebar);
    };
  }, []);

  // ... (Effects and Helper functions like handleGenerate, saveSelection remain unchanged) ...
  // Re-implementing effects and helpers briefly for context
  useEffect(() => { if (externalLoadItem) handleLoadHistory(externalLoadItem); }, [externalLoadItem]);
  useEffect(() => { if (step === 3 && editorRef.current && editorRef.current.innerHTML !== htmlContent) editorRef.current.innerHTML = htmlContent; }, [step, htmlContent]);
  useEffect(() => { if (step === 3) setHasDownloaded(false); }, [step]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) lastSelection.current = range.cloneRange();
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
  const syncContent = () => { if (editorRef.current) setHtmlContent(editorRef.current.innerHTML); };
  const parseMarkdown = (md: string) => md.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-slate-900 border-b-2 border-slate-100 pb-2 break-after-avoid">$1</h1>').replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-slate-800 break-after-avoid">$1</h2>').replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-slate-800 break-after-avoid">$1</h3>').replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>').replace(/\*(.*)\*/gim, '<em>$1</em>').replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1 text-slate-700 list-disc">$1</li>').replace(/\n/gim, '<br />');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const rawText = await generateFinalReport(items, context);
      const html = parseMarkdown(rawText);
      setHtmlContent(html);
      setStep(3);
      onSaveToHistory({ id: Date.now().toString(), date: new Date().toLocaleString(), title: reportTitle, htmlContent: html, visuals: items.filter(i => i.type === 'chart') });
    } catch (error) { console.error(error); } finally { setIsGenerating(false); }
  };

  const handleLoadHistory = (item: ReportHistoryItem) => { setHtmlContent(item.htmlContent); setReportTitle(item.title); setStep(3); };
  const execCmd = (command: string, value: string | undefined = undefined) => { document.execCommand(command, false, value); if (editorRef.current) editorRef.current.focus(); syncContent(); };
  
  const insertHtmlAtCursorOrEnd = (html: string) => {
    if (editorRef.current) {
        editorRef.current.focus();
        if (restoreSelection()) document.execCommand('insertHTML', false, html);
        else {
             const cleanHtml = htmlContent.endsWith('<br>') ? htmlContent : htmlContent + '<br/>';
             editorRef.current.innerHTML = cleanHtml + html;
             editorRef.current.scrollTop = editorRef.current.scrollHeight;
        }
        syncContent();
    }
  };

  const handleSmartInsertChart = async (item: ReportItem) => {
    setInsertingId(item.id);
    const element = document.getElementById(`sidebar-chart-${item.id}`);
    if (!element) { setInsertingId(null); return; }
    try {
        // Wait a bit for chart to fully render with colors
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const canvas = await html2canvas(element, { 
          scale: 2.5, 
          backgroundColor: '#ffffff', 
          useCORS: true, 
          logging: false,
          allowTaint: true,
          onclone: (clonedDoc: Document) => {
            // Ensure colors are rendered in cloned document
            const clonedElement = clonedDoc.getElementById(`sidebar-chart-${item.id}`);
            if (clonedElement) {
              // Force re-render of SVG elements to ensure colors are captured
              const svgs = clonedElement.querySelectorAll('svg');
              svgs.forEach(svg => {
                svg.style.display = 'block';
                svg.style.visibility = 'visible';
              });
            }
          }
        });
        const imgData = canvas.toDataURL('image/png');
        const config = (item.content as any).config;
        const data = (item.content as any).data;
        const aiAnalysis = await generateChartContextForReport(config, data);
        const escapedTitle = item.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const smartHtml = `<div class="chart-container" style="page-break-inside: avoid; margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><div style="padding: 24px; background: white;"><h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 20px 0; text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 12px; letter-spacing: 0.01em; text-transform: none;">${escapedTitle}</h2><div style="text-align: center; margin-top: 16px;"><img src="${imgData}" alt="${escapedTitle}" style="max-width: 100%; max-height: 500px; height: auto; display: inline-block; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div></div><div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;"><div style="display: flex; align-items: flex-start; gap: 10px;"><span style="font-size: 18px;">🤖</span><div><strong style="color: #4f46e5; display: block; margin-bottom: 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">AI Insight</strong><p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6; font-style: italic;">"${aiAnalysis.replace(/"/g, '&quot;')}"</p></div></div></div></div><p><br/></p>`;
        insertHtmlAtCursorOrEnd(smartHtml);
    } catch (error) { console.error("Failed to insert chart", error); alert("Could not insert chart."); } finally { setInsertingId(null); setAiSuggestion(null); }
  };

  const handleAiSuggestVisual = async () => {
      if (!editorRef.current) return;
      setIsThinking(true);
      const text = editorRef.current.innerText;
      const chartOptions = items.filter(i => i.type === 'chart').map(i => ({ id: i.id, title: i.title, type: (i.content as any).config.type }));
      const suggestion = await suggestRelevantChart(text, chartOptions);
      setAiSuggestion(suggestion);
      setIsThinking(false);
      if (!suggestion) alert("AI couldn't find a relevant visual for this context.");
  };

  const handleQualityCheck = async () => {
      if (!editorRef.current) return;
      setIsReviewing(true); setShowReviewModal(true);
      try {
          const content = editorRef.current.innerText;
          const review = await evaluateReportQuality(content);
          setReviewResult(review);
      } catch (error) { console.error("QA failed", error); } finally { setIsReviewing(false); }
  };

  const handleDownloadPDF = async (customTitle?: string, customContent?: string) => {
      const targetElement = customContent ? null : editorRef.current;
      if (!targetElement && !customContent) return;
      setIsDownloading(true);
      const title = customTitle || reportTitle;
      const opt = { margin: [15, 15, 15, 15], filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } };
      try {
        if (customContent) {
          // Create temporary element for history item
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = customContent;
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          document.body.appendChild(tempDiv);
          await html2pdf().set(opt).from(tempDiv).save();
          document.body.removeChild(tempDiv);
        } else {
          await html2pdf().set(opt).from(targetElement).save();
        }
        setHasDownloaded(true);
      } catch (err) { console.error("PDF Fail", err); alert("PDF Error"); } finally { setIsDownloading(false); }
  };
  
  // Expose download handler for history items
  useEffect(() => {
    const downloadHandler = (item: ReportHistoryItem) => {
      handleDownloadPDF(item.title, item.htmlContent);
    };
    (window as any).__reportDownloadHistoryItem = downloadHandler;
    return () => {
      delete (window as any).__reportDownloadHistoryItem;
    };
  }, [reportTitle]);

  const handleShare = (platform: 'email' | 'whatsapp') => {
      const text = `Check out this report: ${reportTitle}`;
      if (platform === 'email') window.open(`mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(text)}`);
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
      setShowShareMenu(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('application/vision-item-id');
      if (!id) return;
      const item = items.find(i => i.id === id);
      if (!item) return;
      if ((document as any).caretRangeFromPoint) {
          const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
          if (range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
              const selection = window.getSelection();
              if (selection) { selection.removeAllRanges(); selection.addRange(range); saveSelection(); }
          }
      }
      await handleSmartInsertChart(item);
  };

  // HISTORY VIEW
  if (step === 'history') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-slate-800">Report History</h2><p className="text-slate-500">Access previously generated strategic reports.</p></div>
                <button onClick={() => setStep(1)} className="text-indigo-600 font-medium hover:underline flex items-center gap-1"><ArrowLeftCircle size={18} /> Back to Builder</button>
              </div>
              {history.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400"><Clock size={48} className="mx-auto mb-4 opacity-50"/><p>No reports generated yet.</p></div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {history.map((h) => (
                          <div key={h.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                              <div className="flex justify-between items-start mb-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={24} /></div><span className="text-xs text-slate-400">{h.date}</span></div>
                              <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{h.title}</h3>
                              <p className="text-sm text-slate-500 mb-4 line-clamp-2">Contains {h.visuals.length} visuals.</p>
                              <button onClick={() => handleLoadHistory(h)} className="w-full py-2 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-sm">View Report</button>
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
                <div className="inline-flex p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4"><FileText size={32} /></div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Report Builder</h2>
                <p className="text-slate-500">Review your collected insights before generation.</p>
            </div>
            <button onClick={() => setStep('history')} className="absolute right-6 top-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600"><History size={18} /> History</button>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"><p className="text-slate-400">Your report cart is empty. Go back and add insights!</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
            {items.map((item) => {
                const isFiltered = item.type === 'chart' && (item.content as any).filterContext && !(item.content as any).filterContext.includes('Full');
                return (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg ${item.type === 'chart' ? 'bg-purple-100 text-purple-600' : item.type === 'insight' ? 'bg-amber-100 text-amber-600' : item.type === 'recommendation' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                           {item.type === 'chart' && <FileText size={20}/>}
                           {item.type === 'insight' && <Sparkles size={20}/>}
                           {item.type === 'recommendation' && <CheckCircle2 size={20}/>}
                           {(item.type === 'quality' || item.type === 'goal') && <Settings2 size={20}/>}
                       </div>
                       <div>
                         <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-800">{item.title}</h4>{isFiltered && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><Filter size={8} /> Filtered</span>}</div>
                         <p className="text-xs text-slate-500 capitalize">{item.type} • Added {item.timestamp.toLocaleTimeString()}</p>
                       </div>
                    </div>
                    <button onClick={() => onRemoveItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                );
            })}
          </div>
        )}
        <div className="flex justify-center pt-6"><button onClick={() => setStep(2)} disabled={items.length === 0} className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">Proceed to Context <ChevronRight size={20} /></button></div>
      </div>
    );
  }

  // 2. Context Step
  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
         <div className="text-center"><h2 className="text-2xl font-bold text-slate-800">Finalize Report Context</h2><p className="text-slate-500 mt-1">Help the AI tailor the report to your specific needs.</p></div>
         <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Report Title</label><input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label><input type="text" value={context.audience} onChange={(e) => setContext({...context, audience: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Tone & Style</label><select value={context.tone} onChange={(e) => setContext({...context, tone: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"><option>Strategic and Data-Driven</option><option>Persuasive and Action-Oriented</option><option>Technical and Detailed</option><option>Simple and Summary-Focused</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Specific Executive Notes</label><textarea value={context.notes} onChange={(e) => setContext({...context, notes: e.target.value})} placeholder="e.g., Emphasize the need for budget increase in Q3..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"/></div>
         </div>
         <div className="flex gap-4"><button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Back</button><button onClick={handleGenerate} disabled={isGenerating} className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">{isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}{isGenerating ? 'AI is Writing Report...' : 'Generate Professional Report'}</button></div>
      </div>
    );
  }

  // 3. Final Result Step (Editor)
  const chartItems = items.filter(i => i.type === 'chart');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 relative">
       {/* Toolbar Header - Fixed below main layout header, accounting for left sidebar */}
       <div className={`flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print fixed top-16 right-0 z-40 transition-all duration-300 ${sidebarExpanded ? 'left-64' : 'left-16'}`} style={{ height: 'auto', minHeight: '64px' }}>
          <div className="flex items-center gap-4">
             <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-700"><ChevronRight size={20} className="rotate-180"/></button>
             <div><h2 className="text-lg font-bold text-slate-800">{reportTitle}</h2><p className="text-xs text-slate-500">Editable Mode</p></div>
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
             <select onChange={(e) => execCmd('fontSize', e.target.value)} className="bg-transparent text-xs font-medium focus:outline-none"><option value="3">Normal</option><option value="5">Large</option><option value="7">Huge</option></select>
             <input type="color" onChange={(e) => execCmd('foreColor', e.target.value)} className="w-6 h-6 border-none cursor-pointer" />
             <div className="w-px h-6 bg-slate-300 mx-1"></div>
             <button onClick={handleAiSuggestVisual} disabled={isThinking} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all active:scale-95 text-xs font-bold" title="Ask AI to insert relevant visual">{isThinking ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} AI Insert Visual</button>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setShowVisualSidebar(!showVisualSidebar)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="Toggle Visuals Sidebar">{showVisualSidebar ? <PanelRightClose size={20}/> : <PanelRightOpen size={20}/>}</button>
             <button onClick={handleQualityCheck} className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium transition-colors"><ShieldCheck size={18} /> Review & Score</button>
             <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"><Share2 size={18} /> Share</button>
                {showShareMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                        <button onClick={() => handleShare('whatsapp')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><MessageCircle size={16} className="text-green-600"/> WhatsApp</button>
                        <button onClick={() => handleShare('email')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"><Mail size={16} className="text-blue-600"/> Email</button>
                    </div>
                )}
             </div>
             {hasDownloaded ? (<button onClick={onFinishSession} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors animate-in fade-in"><CheckCircle2 size={18} /> Finish Session</button>) : (<button onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-colors">{isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}{isDownloading ? 'Generating...' : 'Download PDF'}</button>)}
          </div>
       </div>

       <div className="flex gap-6 pt-32">
           {/* Document Editor */}
           <div className={`transition-all duration-300 ${showVisualSidebar ? 'w-2/3' : 'w-full mx-auto max-w-5xl'}`}>
                <div className="bg-white p-12 rounded-xl shadow-md border border-slate-200 min-h-[1000px] print:shadow-none print:border-none print:p-0 print:w-full" id="report-container" onDrop={handleDrop} onDragOver={handleDragOver}>
                    <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-end">
                        <div><h1 className="text-3xl font-bold text-slate-800">{reportTitle}</h1><p className="text-slate-500 mt-1">Generated by Vision Smart AI • {new Date().toLocaleDateString()}</p></div>
                        <div className="text-right"><div className="font-bold text-slate-800 text-sm">{context.audience}</div><div className="text-xs text-slate-400">Confidential</div></div>
                    </div>
                    <div ref={editorRef} className="prose prose-slate max-w-none focus:outline-none min-h-[500px]" contentEditable suppressContentEditableWarning onInput={() => { saveSelection(); syncContent(); }} onMouseUp={saveSelection} onKeyUp={saveSelection} onBlur={syncContent} dangerouslySetInnerHTML={{ __html: htmlContent }}></div>
                </div>
           </div>

           {/* Visual Sidebar */}
           {showVisualSidebar && chartItems.length > 0 && (
               <div className="w-1/3 space-y-4 no-print sticky top-32 h-fit max-h-[calc(100vh-180px)] overflow-y-auto pr-2 custom-scrollbar">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2 sticky top-0 bg-slate-50 pb-2 z-10"><FileSearch size={18} className="text-indigo-600"/> Visual Appendix</h3>
                   {chartItems.map((item, idx) => (
                       <MiniChart 
                           key={`${item.id}-${idx}`} 
                           item={item} 
                           small={true} 
                           onInsert={(id) => handleSmartInsertChart(items.find(i => i.id === id) as ReportItem)}
                           insertingId={insertingId}
                       />
                   ))}
               </div>
           )}
       </div>

       {/* AI Suggestion Modal */}
       {aiSuggestion && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in-95">
                   <div className="p-6 bg-gradient-to-br from-violet-50 to-indigo-50 border-b border-indigo-100">
                       <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Bot size={24} className="text-indigo-600" /> AI Agent Suggestion</h3>
                       <p className="text-sm text-slate-600 mt-1">Based on your recent report context.</p>
                   </div>
                   <div className="p-6 space-y-4">
                       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="font-bold text-slate-800 mb-2 text-sm flex items-center gap-2"><Sparkles size={14} className="text-amber-500" /> Recommendation</h4>
                           <p className="text-sm text-slate-600 italic">"{aiSuggestion.reasoning}"</p>
                       </div>
                       <div className="border rounded-xl p-2 bg-slate-50">
                           <div className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Visual Preview</div>
                           {/* Render the suggested chart using the new MiniChart component */}
                           {(() => {
                               const item = items.find(i => i.id === aiSuggestion.chartId);
                               return item ? <MiniChart item={item} small={true} /> : <div className="text-red-500 text-xs">Chart not found</div>;
                           })()}
                       </div>
                   </div>
                   <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                       <button onClick={() => setAiSuggestion(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                       <button onClick={() => { const item = items.find(i => i.id === aiSuggestion.chartId); if (item) handleSmartInsertChart(item); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-md shadow-indigo-200 transition-colors">Insert This Visual</button>
                   </div>
               </div>
           </div>
       )}

       {/* Review Modal */}
       {showReviewModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                       <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={24} className="text-amber-500" /> Quality Assurance Review</h3>
                       <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
                   </div>
                   <div className="p-8 overflow-y-auto custom-scrollbar">
                       {isReviewing ? (
                           <div className="text-center py-12"><Loader2 className="animate-spin text-amber-500 mx-auto mb-4" size={48} /><h4 className="text-lg font-semibold text-slate-800">Lead Auditor is reviewing your report...</h4><p className="text-slate-500">Checking for clarity, data accuracy, and professional tone.</p></div>
                       ) : reviewResult ? (
                           <div className="space-y-6">
                               <div className="flex items-center gap-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                   <div className={`text-4xl font-bold p-4 rounded-xl flex-shrink-0 ${reviewResult.score >= 80 ? 'text-green-600 bg-green-100' : reviewResult.score >= 60 ? 'text-amber-600 bg-white' : 'text-red-600 bg-red-100'}`}>{reviewResult.score}<span className="text-sm font-normal text-slate-500 block text-center mt-1">/100</span></div>
                                   <div><h4 className="font-bold text-slate-800">Auditor's Note</h4><p className="text-slate-700 italic">"{reviewResult.auditorNote}"</p></div>
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                   <div><h5 className="font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle2 size={16}/> Strengths</h5><ul className="space-y-1">{reviewResult.strengths.map((s, i) => (<li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="mt-1.5 w-1 h-1 bg-green-400 rounded-full flex-shrink-0"></span><span>{s}</span></li>))}</ul></div>
                                   <div><h5 className="font-bold text-red-700 mb-2 flex items-center gap-2"><XCircle size={16}/> Weaknesses</h5><ul className="space-y-1">{reviewResult.weaknesses.map((s, i) => (<li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full flex-shrink-0"></span><span>{s}</span></li>))}</ul></div>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><h5 className="font-bold text-indigo-700 mb-2 flex items-center gap-2"><Sparkles size={16}/> Suggested Improvements</h5><ul className="space-y-2">{reviewResult.suggestions.map((s, i) => (<li key={i} className="text-sm text-slate-700 flex items-start gap-2"><ArrowLeftCircle size={14} className="mt-0.5 text-indigo-400 rotate-180 flex-shrink-0" /><span>{s}</span></li>))}</ul></div>
                           </div>
                       ) : (<div className="text-center text-slate-500">Review failed. Please try again.</div>)}
                   </div>
                   <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
                       <button onClick={() => setShowReviewModal(false)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Close Review</button>
                       {!isReviewing && reviewResult && reviewResult.score < 100 && (<button onClick={() => setShowReviewModal(false)} className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">Make Edits</button>)}
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
