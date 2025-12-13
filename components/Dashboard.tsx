
import React, { useState, useMemo, useCallback } from 'react';
import { PatientRecord, ChartConfig, ReportItem } from '../types';
import { generateDatasetSummary, getFilterableColumns } from '../services/dataService';
import { generateChartExplanation, generateSingleChartConfig } from '../services/geminiService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter, Treemap,
  ZAxis
} from 'recharts';
import { 
  Layout, Loader2, BarChart2, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, Activity, X, PlusCircle, Sparkles, Filter, 
  ScatterChart as ScatterIcon, Map as MapIcon, BoxSelect, AlertTriangle, 
  Calculator, Pencil, Trash2, Check
} from 'lucide-react';

interface DashboardProps {
  data: PatientRecord[];
  goal: string;
  config: ChartConfig[];
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#84cc16', '#3b82f6'];

// Static Configurations for Recharts to prevent ref errors
const TOOLTIP_STYLE = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' };
const TOOLTIP_CURSOR = { fill: '#f8fafc' };
const AXIS_TICK_STYLE = { fontSize: 10, fill: '#94a3b8' };
const BAR_MARGIN = { top: 10, right: 10, bottom: 20, left: 0 };
const SCATTER_MARGIN = { top: 10, right: 10, bottom: 20, left: 0 };
const PIE_LEGEND_STYLE = { fontSize: '10px' };

// --- WIDGET COMPONENT ---
const WidgetCard: React.FC<{
    chart: ChartConfig;
    data: PatientRecord[];
    onRemove: () => void;
    onAdd: (data: any) => void;
    onExplain: () => void;
    isEditing: boolean;
}> = React.memo(({ chart, data, onRemove, onAdd, onExplain, isEditing }) => {
    
    // Memoize the chart-specific data transformation
    const chartData = useMemo(() => {
        const { type, dataKey, xAxisKey, aggregation } = chart;
        
        if (type === 'kpi') {
            if (aggregation === 'count') return data.length;
            const sum = data.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0);
            if (aggregation === 'average') return data.length ? sum / data.length : 0;
            return sum;
        }

        if (type === 'scatter' || type === 'boxplot') {
            if (!xAxisKey) return [];
            return data.slice(0, 300).map(row => ({
                x: row[xAxisKey],
                y: Number(row[dataKey]) || 0,
                z: 1
            })).filter(p => p.x != null && !isNaN(p.y));
        }

        if (!xAxisKey) return [];
        const groups: Record<string, { sum: number, count: number }> = {};
        
        data.forEach(row => {
            const key = String(row[xAxisKey] || 'Unknown');
            if (!groups[key]) groups[key] = { sum: 0, count: 0 };
            const val = Number(row[dataKey]);
            if (!isNaN(val)) {
                groups[key].sum += val;
                groups[key].count += 1;
            }
        });

        return Object.entries(groups).map(([name, stats]) => {
            let value = 0;
            if (aggregation === 'count') value = stats.count;
            else if (aggregation === 'average') value = stats.count ? stats.sum / stats.count : 0;
            else value = stats.sum;
            return { name, value: Number(value.toFixed(2)) };
        }).sort((a, b) => b.value - a.value).slice(0, 20);
    }, [chart, data]);

    const getIcon = (type: string) => {
        switch(type) {
            case 'bar': return <BarChart2 size={18}/>;
            case 'line': return <LineChartIcon size={18}/>;
            case 'pie': return <PieChartIcon size={18}/>;
            case 'kpi': return <Calculator size={18}/>;
            case 'scatter': return <ScatterIcon size={18}/>;
            case 'map': return <MapIcon size={18}/>;
            case 'boxplot': return <BoxSelect size={18}/>;
            default: return <Activity size={18}/>;
        }
    };

    const handleAddToReport = () => onAdd(chartData);

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative group hover:shadow-md transition-shadow duration-300 ${chart.type === 'kpi' ? 'col-span-1 h-40' : 'col-span-1 md:col-span-2 h-80'}`}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-400 bg-white p-1 rounded-md shadow-sm border border-slate-100">
                        {getIcon(chart.type)}
                    </span>
                    <h3 className="font-bold text-slate-700 text-sm truncate" title={chart.title}>
                        {chart.title}
                    </h3>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                        <button onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={16} />
                        </button>
                    ) : (
                        <>
                            <button onClick={handleAddToReport} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Add to Report">
                                <PlusCircle size={16} />
                            </button>
                            <button onClick={onExplain} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="AI Insight">
                                <Sparkles size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 min-h-0 w-full relative">
                {(!chartData || (Array.isArray(chartData) && chartData.length === 0)) ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
                ) : chart.type === 'kpi' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="text-4xl font-bold text-indigo-600 mb-2 font-mono">
                            {(chartData as number).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {chart.aggregation} of {chart.dataKey}
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chart.type === 'bar' ? (
                            <BarChart data={chartData as any[]} margin={BAR_MARGIN}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} interval={0} angle={-15} textAnchor="end" height={40} axisLine={false} tickLine={false}/>
                                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {(chartData as any[]).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        ) : chart.type === 'line' ? (
                            <LineChart data={chartData as any[]} margin={BAR_MARGIN}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} height={40} angle={-15} textAnchor="end" axisLine={false} tickLine={false}/>
                                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{r:3}} activeDot={{r:5}} />
                            </LineChart>
                        ) : chart.type === 'pie' ? (
                            <PieChart>
                                <Pie data={chartData as any[]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {(chartData as any[]).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={PIE_LEGEND_STYLE}/>
                            </PieChart>
                        ) : chart.type === 'map' ? (
                            <Treemap data={chartData as any[]} dataKey="value" aspectRatio={4/3} stroke="#fff">
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </Treemap>
                        ) : (
                            <ScatterChart margin={SCATTER_MARGIN}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                                <XAxis type="category" dataKey="x" name={chart.xAxisKey} tick={AXIS_TICK_STYLE} height={40} angle={-15} textAnchor="end" axisLine={false} tickLine={false}/>
                                <YAxis type="number" dataKey="y" name={chart.dataKey} tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}/>
                                <ZAxis type="number" dataKey="z" range={[60, 60]} />
                                <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={TOOLTIP_STYLE} />
                                <Scatter name={chart.title} data={chartData as any[]} fill="#8b5cf6">
                                    {(chartData as any[]).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
});
WidgetCard.displayName = 'WidgetCard';

const Dashboard: React.FC<DashboardProps> = ({ data, goal, config, onAddToReport }) => {
  const [widgets, setWidgets] = useState<ChartConfig[]>(config);
  const [isEditing, setIsEditing] = useState(false);
  const [filterCol, setFilterCol] = useState<string>('');
  const [filterVal, setFilterVal] = useState<string>('');
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('manual');
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [explanation, setExplanation] = useState<{ isOpen: boolean; title: string; content: string; loading: boolean }>({
    isOpen: false, title: '', content: '', loading: false
  });

  const filterableColumns = useMemo(() => getFilterableColumns(data), [data]);
  const allColumns = useMemo(() => data.length > 0 ? Object.keys(data[0]) : [], [data]);
  
  // State initialization moved after useMemo for allColumns to be available, though React state init is lazy. 
  // However, allColumns isn't available during first render if we used it in useState initializer directly without useEffect.
  // But we use it in the render body.
  const [manualConfig, setManualConfig] = useState<{
      title: string;
      type: ChartConfig['type'];
      dataKey: string;
      xAxisKey: string;
      aggregation: ChartConfig['aggregation'];
  }>({
      title: '',
      type: 'bar',
      dataKey: '',
      xAxisKey: '',
      aggregation: 'sum'
  });

  const displayData = useMemo(() => {
    if (!filterCol || !filterVal || filterVal === 'All') return data;
    return data.filter(d => String(d[filterCol]) === filterVal);
  }, [data, filterCol, filterVal]);

  const uniqueFilterValues = useMemo(() => {
    if (!filterCol) return [];
    const values = new Set(data.map(d => String(d[filterCol] || '')));
    return Array.from(values).sort().filter(v => v);
  }, [data, filterCol]);

  const handleRemoveWidget = useCallback((index: number) => {
    setWidgets(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerateWidget = async () => {
    if (!customPrompt.trim()) return;
    setIsGenerating(true);
    try {
        const summary = generateDatasetSummary(data);
        const columns = Object.keys(data[0] || {});
        const newChart = await generateSingleChartConfig(goal, customPrompt, summary, columns);
        setWidgets(prev => [...prev, newChart]);
        setCustomPrompt('');
        setIsEditing(false); 
    } catch (e) {
        console.error(e);
        alert("Could not generate chart. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAddManualWidget = () => {
      if (!manualConfig.dataKey) return;
      const finalConfig: ChartConfig = {
          ...manualConfig,
          title: manualConfig.title || `${manualConfig.aggregation} of ${manualConfig.dataKey} by ${manualConfig.xAxisKey || 'Total'}`,
          xAxisKey: manualConfig.xAxisKey || undefined
      };
      setWidgets(prev => [...prev, finalConfig]);
      // Safely reset config
      setManualConfig({ 
          title: '', 
          type: 'bar', 
          dataKey: allColumns.length > 0 ? allColumns[0] : '', 
          xAxisKey: '', 
          aggregation: 'sum' 
      });
      setIsEditing(false);
  };

  const handleExplain = useCallback(async (chart: ChartConfig) => {
      setExplanation({ isOpen: true, title: chart.title, content: '', loading: true });
      const summary = generateDatasetSummary(displayData);
      const text = await generateChartExplanation(goal, chart, summary);
      setExplanation(prev => ({ ...prev, loading: false, content: text }));
  }, [displayData, goal]);

  const handleAddToReportWrap = useCallback((chart: ChartConfig, chartData: any) => {
      const filterContext = (filterCol && filterVal !== 'All') ? `Filtered by ${filterCol}: ${filterVal}` : 'Full Dataset';
      onAddToReport({
          type: 'chart',
          title: chart.title,
          content: { config: chart, data: chartData, filterContext }
      });
  }, [filterCol, filterVal, onAddToReport]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Layout className="text-indigo-600" /> Vision Board
                </h2>
                <p className="text-slate-500 text-sm mt-1">Real-time analytics for: <span className="font-semibold text-slate-700">{goal}</span></p>
            </div>

            <div className="flex items-center gap-3">
                {filterableColumns.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm">
                        <div className="px-2 text-slate-400">
                            <Filter size={16} />
                        </div>
                        <select 
                            value={filterCol}
                            onChange={(e) => { setFilterCol(e.target.value); setFilterVal(''); }}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                        >
                            <option value="">No Filter</option>
                            {filterableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {filterCol && (
                            <>
                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                <select 
                                    value={filterVal}
                                    onChange={(e) => setFilterVal(e.target.value)}
                                    className="bg-indigo-50 text-indigo-700 text-sm font-bold rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    {uniqueFilterValues.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </>
                        )}
                    </div>
                )}
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`p-2 rounded-lg transition-colors border ${isEditing ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    title="Edit Dashboard"
                >
                    {isEditing ? <Check size={18} /> : <Pencil size={18} />}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {widgets.map((chart, idx) => (
                <WidgetCard 
                    key={`${chart.title}-${idx}`} 
                    chart={chart}
                    data={displayData}
                    isEditing={isEditing}
                    onRemove={() => handleRemoveWidget(idx)}
                    onExplain={() => handleExplain(chart)}
                    onAdd={(data) => handleAddToReportWrap(chart, data)}
                />
            ))}

            {isEditing && (
                <div className="col-span-1 md:col-span-2 h-80 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col p-4 transition-all">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <PlusCircle size={18} className="text-indigo-600"/> New Widget
                        </h3>
                        <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg">
                            <button 
                                onClick={() => setCreationMode('manual')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${creationMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Manual
                            </button>
                            <button 
                                onClick={() => setCreationMode('ai')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${creationMode === 'ai' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Ask AI
                            </button>
                        </div>
                    </div>

                    {creationMode === 'ai' ? (
                        <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                            <div className="bg-white p-3 rounded-full shadow-sm w-fit mx-auto mb-4 text-purple-500">
                                <Sparkles size={24} />
                            </div>
                            <div className="relative w-full max-w-sm">
                                <input 
                                    type="text"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="e.g. 'Show trend of Sales by Date'"
                                    className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none pr-10"
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateWidget()}
                                />
                                <button 
                                    onClick={handleGenerateWidget}
                                    disabled={isGenerating || !customPrompt.trim()}
                                    className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Describe what you want to see.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Chart Type</label>
                                    <select 
                                        value={manualConfig.type} 
                                        onChange={(e) => setManualConfig({...manualConfig, type: e.target.value as any})}
                                        className="w-full p-2 border rounded-md text-sm bg-white"
                                    >
                                        <option value="bar">Bar Chart</option>
                                        <option value="line">Line Chart</option>
                                        <option value="pie">Pie Chart</option>
                                        <option value="scatter">Scatter Plot</option>
                                        <option value="boxplot">Boxplot (Distribution)</option>
                                        <option value="map">Tree Map</option>
                                        <option value="kpi">KPI Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Aggregation</label>
                                    <select 
                                        value={manualConfig.aggregation} 
                                        onChange={(e) => setManualConfig({...manualConfig, aggregation: e.target.value as any})}
                                        className="w-full p-2 border rounded-md text-sm bg-white"
                                        disabled={manualConfig.type === 'scatter' || manualConfig.type === 'boxplot'}
                                    >
                                        <option value="sum">Sum</option>
                                        <option value="average">Average</option>
                                        <option value="count">Count</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                                    {manualConfig.type === 'scatter' || manualConfig.type === 'boxplot' ? 'Y-Axis Value (Numeric)' : 'Value Column (Y-Axis)'}
                                </label>
                                <select 
                                    value={manualConfig.dataKey} 
                                    onChange={(e) => setManualConfig({...manualConfig, dataKey: e.target.value})}
                                    className="w-full p-2 border rounded-md text-sm bg-white"
                                >
                                    <option value="">Select Column...</option>
                                    {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {manualConfig.type !== 'kpi' && (
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                                        {manualConfig.type === 'scatter' || manualConfig.type === 'boxplot' ? 'X-Axis Group (Category)' : 'Group By (X-Axis)'}
                                    </label>
                                    <select 
                                        value={manualConfig.xAxisKey} 
                                        onChange={(e) => setManualConfig({...manualConfig, xAxisKey: e.target.value})}
                                        className="w-full p-2 border rounded-md text-sm bg-white"
                                    >
                                        <option value="">Select Column...</option>
                                        {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}

                            <button 
                                onClick={handleAddManualWidget}
                                disabled={!manualConfig.dataKey}
                                className="mt-auto w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                Add Chart
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>

        {explanation.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-600"/> Metric Insight
                        </h3>
                        <button onClick={() => setExplanation(prev => ({...prev, isOpen: false}))} className="text-slate-400 hover:text-slate-700">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{explanation.title}</h4>
                        {explanation.loading ? (
                            <div className="flex flex-col items-center py-8 gap-3 text-slate-400">
                                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                                <p className="text-sm">Analyzing data patterns...</p>
                            </div>
                        ) : (
                            <p className="text-slate-700 leading-relaxed text-sm">
                                {explanation.content}
                            </p>
                        )}
                        {filterVal && filterVal !== 'All' && !explanation.loading && (
                            <div className="mt-4 p-2 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                Analysis reflects filtered data: <strong>{filterCol} = {filterVal}</strong>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
