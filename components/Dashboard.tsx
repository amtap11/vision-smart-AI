import React, { useState, useEffect, useMemo } from 'react';
import { PatientRecord, ChartConfig, ReportItem } from '../types';
import { generateDatasetSummary, getFilterableColumns } from '../services/dataService';
import { generateChartExplanation, generateSingleChartConfig } from '../services/geminiService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter, Treemap
} from 'recharts';
import { 
  Download, TrendingUp, Layout, Loader2, 
  CheckCircle2, XCircle, BarChart2, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, Activity, ArrowRight, Settings2, Info, X, PlusCircle, Sparkles, Plus, Filter, ScatterChart as ScatterIcon, Map as MapIcon, BoxSelect, Grip, AlertTriangle, SlidersHorizontal, Calculator
} from 'lucide-react';

interface DashboardProps {
  data: PatientRecord[];
  goal: string;
  config: ChartConfig[];
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

// Modern Corporate Palette
const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#84cc16', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ data, goal, config, onAddToReport }) => {
  // Config State
  const [widgets, setWidgets] = useState<ChartConfig[]>(config);

  // Review Mode State
  const [reviewMode, setReviewMode] = useState(true);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [finalConfig, setFinalConfig] = useState<ChartConfig[]>([]);

  // Filtering State
  const [filterCol, setFilterCol] = useState<string>('');
  const [filterVal, setFilterVal] = useState<string>('');

  // Manual Entry State
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // Manual Builder State
  const [addMode, setAddMode] = useState<'ai' | 'manual'>('ai');
  const [manualConfig, setManualConfig] = useState<ChartConfig>({
      title: '',
      type: 'bar',
      dataKey: '',
      xAxisKey: '',
      aggregation: 'sum'
  });

  // Animation/Display State
  const [visibleWidgets, setVisibleWidgets] = useState<number>(0);
  const [isBuilding, setIsBuilding] = useState(false);

  // Explanation Modal State
  const [explanationState, setExplanationState] = useState<{
    isOpen: boolean;
    loading: boolean;
    title: string;
    content: string;
    chartIndex: number | null;
  }>({ isOpen: false, loading: false, title: '', content: '', chartIndex: null });
  const [explanationCache, setExplanationCache] = useState<Record<number, string>>({});

  // Filter Logic
  const filterableColumns = useMemo(() => getFilterableColumns(data), [data]);
  const allColumns = useMemo(() => data.length > 0 ? Object.keys(data[0]) : [], [data]);
  
  const filterOptions = useMemo(() => {
      if (!filterCol) return [];
      return Array.from(new Set(data.map(d => String(d[filterCol])))).sort();
  }, [data, filterCol]);

  // CRITICAL: Ensure displayData reflects the filter state accurately for all consumers
  const displayData = useMemo(() => {
      if (!filterCol || !filterVal || filterVal === 'All') return data;
      return data.filter(d => String(d[filterCol]) === filterVal);
  }, [data, filterCol, filterVal]);

  // Initialize selection when config prop changes
  useEffect(() => {
    setWidgets(config);
    setReviewMode(true);
    setSelectedIndices(new Set(config.map((_, i) => i)));
    setFinalConfig([]);
    setVisibleWidgets(0);
    setIsBuilding(false);
  }, [config]);

  // Start building animation when review is done
  useEffect(() => {
    if (!reviewMode && isBuilding) {
      const interval = setInterval(() => {
        setVisibleWidgets(prev => {
          if (prev < finalConfig.length) {
            return prev + 1;
          }
          setIsBuilding(false);
          clearInterval(interval);
          return prev;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [reviewMode, isBuilding, finalConfig.length]);

  const handleToggleItem = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleBuildDashboard = () => {
    const filtered = widgets.filter((_, i) => selectedIndices.has(i));
    setFinalConfig(filtered);
    setReviewMode(false);
    setIsBuilding(true);
    setVisibleWidgets(0);
  };

  const handleChartClick = (chart: ChartConfig, entry: any) => {
    if (!chart.xAxisKey || isBuilding) return;
    
    // Some charts might pass 'payload' with the name, others just the object
    const clickedValue = entry.name || entry.payload?.name;
    const clickedColumn = chart.xAxisKey;

    if (!clickedValue) return;

    if (filterCol === clickedColumn && filterVal === clickedValue) {
      // Toggle off
      setFilterCol('');
      setFilterVal('');
    } else {
      // Set filter
      setFilterCol(clickedColumn);
      setFilterVal(clickedValue);
    }
  };

  const handleAddCustomChart = async () => {
    if (!customPrompt.trim()) return;
    setIsGeneratingCustom(true);
    
    try {
        const summary = generateDatasetSummary(data);
        const colNames = data.length > 0 ? Object.keys(data[0]) : [];
        const newChart = await generateSingleChartConfig(goal, customPrompt, summary, colNames);
        
        setWidgets(prev => {
            const next = [...prev, newChart];
            setSelectedIndices(curr => new Set(curr).add(next.length - 1));
            return next;
        });
        setCustomPrompt("");
    } catch (error) {
        console.error("Failed to generate chart", error);
    } finally {
        setIsGeneratingCustom(false);
    }
  };

  const handleAddManualChart = () => {
      if (!manualConfig.title || !manualConfig.dataKey) return;
      
      // Defaults for Scatter/Boxplot
      const finalChartConfig = { ...manualConfig };
      if (finalChartConfig.type === 'scatter' || finalChartConfig.type === 'boxplot') {
          finalChartConfig.aggregation = 'none';
      }

      setWidgets(prev => {
          const next = [...prev, finalChartConfig];
          setSelectedIndices(curr => new Set(curr).add(next.length - 1));
          return next;
      });
      
      // Reset form
      setManualConfig({
          title: '',
          type: 'bar',
          dataKey: '',
          xAxisKey: '',
          aggregation: 'sum'
      });
  };

  const handleShowExplanation = async (e: React.MouseEvent, index: number, chart: ChartConfig) => {
    e.stopPropagation();
    if (explanationCache[index]) {
      setExplanationState({
        isOpen: true,
        loading: false,
        title: chart.title,
        content: explanationCache[index],
        chartIndex: index
      });
      return;
    }

    setExplanationState({
      isOpen: true,
      loading: true,
      title: chart.title,
      content: '',
      chartIndex: index
    });

    const summary = generateDatasetSummary(displayData); // Use filtered data context for explanation
    const text = await generateChartExplanation(goal, chart, summary);
    
    setExplanationCache(prev => ({...prev, [index]: text}));
    setExplanationState({
      isOpen: true,
      loading: false,
      title: chart.title,
      content: text,
      chartIndex: index
    });
  };

  const closeExplanation = () => {
    setExplanationState(prev => ({ ...prev, isOpen: false }));
  };

  const handleAddToCart = (chart: ChartConfig) => {
      // CAPTURE CURRENT STATE: Pass the filtered data (displayData) to the report
      const processed = getProcessedData(chart, displayData);
      
      const filterSuffix = (filterCol && filterVal && filterVal !== 'All') 
          ? ` (${filterVal})` 
          : '';

      onAddToReport({
          type: 'chart',
          title: `${chart.title}${filterSuffix}`,
          content: { 
              config: chart, 
              data: processed, 
              // Explicitly note the filter context so ReportGen can display it
              filterContext: (filterCol && filterVal && filterVal !== 'All') 
                  ? `Filtered by ${filterCol}: ${filterVal}` 
                  : 'Full Dataset' 
          }
      });
  };

  // Transform Data Logic
  const getProcessedData = (chart: ChartConfig, sourceData: PatientRecord[]) => {
    const { type, dataKey, xAxisKey, aggregation } = chart;
    
    // KPI Logic
    if (type === 'kpi') {
       if (aggregation === 'count') {
         return sourceData.length;
       }
       if (aggregation === 'sum' || aggregation === 'average') {
         const sum = sourceData.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0);
         return aggregation === 'average' ? (sourceData.length ? sum / sourceData.length : 0) : sum;
       }
       return 0;
    }

    // Scatter / Boxplot (Distribution) Logic - No Aggregation usually
    if (type === 'scatter' || type === 'boxplot') {
        if (!xAxisKey) return [];
        // Limit to 200 points for performance/clarity in scatter
        return sourceData.slice(0, 200).map(row => ({
            x: row[xAxisKey], // Category or Number
            y: Number(row[dataKey]) || 0,
            z: 1 // Default size
        })).filter(pt => pt.y !== 0 && pt.x !== null && pt.x !== undefined);
    }

    // Aggregated Charts (Bar, Line, Pie, Map/Treemap)
    if (!xAxisKey) return [];

    const grouped: Record<string, { count: number, sum: number }> = {};
    
    sourceData.forEach(row => {
      const key = String(row[xAxisKey] || 'Unknown');
      if (!grouped[key]) grouped[key] = { count: 0, sum: 0 };
      
      const val = Number(row[dataKey]) || 0;
      grouped[key].count += 1;
      grouped[key].sum += val;
    });

    const result = Object.keys(grouped).map(k => {
      let value = 0;
      if (aggregation === 'count') value = grouped[k].count;
      else if (aggregation === 'sum') value = grouped[k].sum;
      else if (aggregation === 'average') value = grouped[k].sum / grouped[k].count;

      return {
        name: k,
        value: Number(value.toFixed(2))
      };
    }).sort((a, b) => b.value - a.value);

    // For Treemaps, don't slice as much to show density
    if (type === 'map') return result.slice(0, 30);
    return result.slice(0, 20);
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'bar': return <BarChart2 size={24} className="text-indigo-500" />;
      case 'line': return <LineChartIcon size={24} className="text-purple-500" />;
      case 'pie': return <PieChartIcon size={24} className="text-emerald-500" />;
      case 'scatter': return <ScatterIcon size={24} className="text-rose-500" />;
      case 'boxplot': return <BoxSelect size={24} className="text-amber-500" />;
      case 'map': return <MapIcon size={24} className="text-sky-500" />;
      case 'kpi': return <Calculator size={24} className="text-indigo-600" />;
      default: return <Activity size={24} className="text-slate-500" />;
    }
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
          <p className="font-bold text-slate-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={index} style={{ color: entry.color }} className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></span>
                {entry.name}: {Number(entry.value).toLocaleString()}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Treemap Custom Content
  const CustomizeTreemapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, name, value, chartConfig } = props;
    
    // Check filter state specifically for this treemap
    const isFilterSource = filterCol && chartConfig?.xAxisKey === filterCol;
    const isSelected = isFilterSource && filterVal === name;
    const isDimmed = isFilterSource && !isSelected;

    return (
      <g 
        onClick={(e) => {
            e.stopPropagation(); // Prevent propagation if needed
            handleChartClick(chartConfig, { name, value });
        }}
        style={{ cursor: 'pointer' }}
      >
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
            opacity: isDimmed ? 0.3 : 1,
            transition: 'opacity 0.3s'
          }}
        />
        {width > 50 && height > 30 && (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold" style={{ pointerEvents: 'none', opacity: isDimmed ? 0.3 : 1 }}>
            {name}
          </text>
        )}
      </g>
    );
  };

  // VALIDATION HELPER
  const checkConfigValidity = (chart: ChartConfig): string | null => {
    if (displayData.length === 0) return null; // Can't validate empty data
    const sample = displayData[0];
    const keys = Object.keys(sample);

    if (chart.dataKey !== 'count' && !keys.includes(chart.dataKey)) {
        return `Metric column '${chart.dataKey}' not found in dataset.`;
    }
    if (chart.xAxisKey && !keys.includes(chart.xAxisKey) && chart.type !== 'kpi') {
        return `Grouping column '${chart.xAxisKey}' not found in dataset.`;
    }
    return null; // Valid
  };


  const renderWidget = (chart: ChartConfig, index: number) => {
    const error = checkConfigValidity(chart);
    
    // Drill-down Logic:
    // If this chart is the SOURCE of the current filter, we show the FULL dataset (highlighting the selection).
    // Otherwise, we show the filtered dataset (contextual data).
    const isFilterSource = filterCol && chart.xAxisKey === filterCol;
    const chartDataSource = isFilterSource ? data : displayData;
    const processedData = !error ? getProcessedData(chart, chartDataSource) : [];
    
    // Determine Axis Type for Scatter
    const isXNumeric = Array.isArray(processedData) && processedData.length > 0 && typeof (processedData[0] as any).x === 'number';

    if (chart.type === 'kpi') {
      if (error) {
           return (
             <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex items-center gap-3">
                <AlertTriangle className="text-red-400" size={20} />
                <div className="text-xs text-red-600 font-medium">Data Error: {error}</div>
             </div>
           );
      }
      const val = processedData as number;
      let displayVal = val.toLocaleString();
      if (['amount', 'price', 'cost', 'revenue', 'profit'].some(k => chart.dataKey.toLowerCase().includes(k))) displayVal = `$${displayVal}`;
      if (chart.aggregation === 'average') displayVal = Number(val).toFixed(1);

      return (
        <KPICard 
          title={chart.title} 
          value={displayVal}
          icon={<TrendingUp size={20} className="text-indigo-600"/>}
          bg="bg-indigo-50"
          onInfoClick={(e) => handleShowExplanation(e, index, chart)}
          onAddClick={() => handleAddToCart(chart)}
        />
      );
    }

    // Chart Containers
    const commonContainerProps = { width: "100%", height: "100%" };

    return (
      <div className={`bg-white p-6 rounded-xl border transition-all duration-300 flex flex-col h-[420px] relative group hover:shadow-lg ${isFilterSource ? 'border-indigo-300 ring-2 ring-indigo-50 shadow-md' : 'border-slate-100 shadow-sm'}`}>
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-slate-800 pr-8 leading-tight flex items-center gap-2">
                {chart.title}
                {isFilterSource && <Filter size={14} className="text-indigo-600" />}
            </h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!error && (
                    <>
                        <button 
                        onClick={() => handleAddToCart(chart)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-1.5 transition-colors"
                        title="Add to Report"
                        >
                        <Plus size={18} />
                        </button>
                        <button 
                        onClick={(e) => handleShowExplanation(e, index, chart)}
                        className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded p-1.5 transition-colors"
                        title="Analyze this metric"
                        >
                        <Info size={18} />
                        </button>
                    </>
                )}
            </div>
        </div>
        
        <p className="text-xs text-slate-400 mb-6 uppercase tracking-wide flex items-center gap-2 font-semibold">
           {getChartIcon(chart.type)}
           <span>
             {chart.type === 'map' ? 'Regional Distribution' : 
              chart.type === 'boxplot' ? 'Distribution Spread' : 
              chart.type === 'scatter' ? 'Correlation Analysis' :
              `${chart.aggregation === 'none' ? 'Raw Data' : chart.aggregation} by ${chart.xAxisKey}`}
           </span>
           {isFilterSource && (
               <span className="ml-auto text-indigo-600 text-[10px] bg-indigo-50 px-2 py-0.5 rounded">Filtering Dashboard</span>
           )}
        </p>
        
        <div className="flex-1 min-h-0 w-full relative">
          {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <AlertTriangle className="text-amber-400 mb-2" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Configuration Error</p>
                  <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
          ) : (
            <ResponsiveContainer {...commonContainerProps}>
                {chart.type === 'bar' ? (
                <BarChart data={processedData as any[]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-15} textAnchor="end" height={60} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar 
                        dataKey="value" 
                        fill="url(#colorGradient)" 
                        radius={[6, 6, 0, 0]}
                        onClick={(data) => handleChartClick(chart, data)}
                        cursor="pointer"
                    >
                        {(processedData as any[]).map((entry, index) => {
                            const isSelected = isFilterSource && filterVal === entry.name;
                            const isDimmed = isFilterSource && !isSelected;
                            return (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    opacity={isDimmed ? 0.3 : 1}
                                    stroke={isSelected ? '#312e81' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
                ) : chart.type === 'line' ? (
                <LineChart data={processedData as any[]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} height={60} angle={-15} textAnchor="end" axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{r: 4, fill: '#fff', strokeWidth: 2}} 
                        activeDot={{r: 6, fill: '#6366f1'}}
                    />
                </LineChart>
                ) : chart.type === 'pie' ? (
                <PieChart>
                    <Pie
                        data={processedData as any[]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onClick={(data) => handleChartClick(chart, data)}
                        cursor="pointer"
                    >
                    {(processedData as any[]).map((entry, index) => {
                        const isSelected = isFilterSource && filterVal === entry.name;
                        const isDimmed = isFilterSource && !isSelected;
                        return (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                                opacity={isDimmed ? 0.3 : 1}
                                stroke={isSelected ? '#312e81' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                            />
                        );
                    })}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
                ) : chart.type === 'map' ? (
                <Treemap
                    data={processedData as any[]}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<CustomizeTreemapContent chartConfig={chart} />}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
                ) : (chart.type === 'scatter' || chart.type === 'boxplot') ? (
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                        type={isXNumeric ? "number" : "category"} 
                        dataKey="x" 
                        name={chart.xAxisKey} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        height={60} 
                        angle={-15} 
                        textAnchor="end" 
                        allowDuplicatedCategory={false} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={chart.dataKey} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name={chart.title} data={processedData as any[]} fill="#8884d8">
                        {(processedData as any[]).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Scatter>
                </ScatterChart>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">Chart Loading Error</div>
                )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  // --- REVIEW MODE RENDER ---
  if (reviewMode) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm border border-indigo-100">
            <Settings2 size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Configure Your Vision Board</h2>
          <p className="text-slate-500">
            SmartData AI has generated {config.length} recommended widgets to track your goal: <span className="font-semibold text-slate-800">"{goal}"</span>. 
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {widgets.map((item, idx) => {
            const isSelected = selectedIndices.has(idx);
            const error = checkConfigValidity(item); // Check validity in review mode too

            return (
              <div 
                key={idx}
                onClick={() => !error && handleToggleItem(idx)}
                className={`
                  relative group p-6 rounded-xl border-2 transition-all duration-300
                  ${error ? 'cursor-not-allowed border-red-200 bg-red-50' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'}
                  ${!error && isSelected ? 'border-indigo-500 bg-white shadow-md' : !error ? 'border-slate-200 bg-slate-50 opacity-60 grayscale-[0.5]' : ''}
                `}
              >
                {!error && (
                    <div className="absolute top-4 right-4 z-10">
                    {isSelected ? (
                        <CheckCircle2 className="text-indigo-500" size={24} fill="white" />
                    ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white" />
                    )}
                    </div>
                )}

                <div className="mb-4 p-3 bg-slate-100 w-fit rounded-lg text-indigo-600">
                  {getChartIcon(item.type)}
                </div>

                <h3 className="font-bold text-slate-800 mb-1 leading-tight">{item.title}</h3>
                
                {error ? (
                    <div className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> {error}
                    </div>
                ) : (
                    <>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                        {item.type === 'map' ? 'Regional Map' : item.type} • {item.aggregation}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {item.description || `Visualizes ${item.dataKey} grouped by ${item.xAxisKey || 'Total'}`}
                        </p>
                    </>
                )}
              </div>
            );
          })}
          
           {/* Add Widget Card (AI & Manual) */}
           <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col hover:bg-white transition-all hover:shadow-md group overflow-hidden">
               {/* Tabs */}
               <div className="flex border-b border-slate-200">
                   <button 
                       onClick={() => setAddMode('ai')}
                       className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${addMode === 'ai' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       <Sparkles size={16} /> AI Gen
                   </button>
                   <button 
                       onClick={() => setAddMode('manual')}
                       className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${addMode === 'manual' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                       <SlidersHorizontal size={16} /> Builder
                   </button>
               </div>

               {/* Content */}
               <div className="p-5 flex-1 flex flex-col gap-4">
                  {addMode === 'ai' ? (
                      <>
                          <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
                              <PlusCircle className="text-indigo-600 group-hover:scale-110 transition-transform" />
                              <span>AI Custom Widget</span>
                          </div>
                          <textarea 
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="e.g. 'Scatter plot of Age vs Spend', 'Treemap of sales by region'"
                              className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 bg-white"
                          />
                          <button
                              onClick={handleAddCustomChart}
                              disabled={isGeneratingCustom || !customPrompt.trim()}
                              className="mt-auto w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                              {isGeneratingCustom ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                              {isGeneratingCustom ? 'Generating...' : 'Generate Widget'}
                          </button>
                      </>
                  ) : (
                      <div className="space-y-3">
                          <input 
                              type="text" 
                              value={manualConfig.title} 
                              onChange={(e) => setManualConfig({...manualConfig, title: e.target.value})}
                              placeholder="Chart Title"
                              className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          
                          <select 
                              value={manualConfig.type} 
                              onChange={(e) => setManualConfig({...manualConfig, type: e.target.value as any})}
                              className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          >
                              <option value="bar">Bar Chart</option>
                              <option value="line">Line Chart</option>
                              <option value="pie">Pie Chart</option>
                              <option value="kpi">KPI Card</option>
                              <option value="scatter">Scatter Plot</option>
                              <option value="boxplot">Boxplot</option>
                              <option value="map">Map (Treemap)</option>
                          </select>

                          <div className="grid grid-cols-2 gap-2">
                            <select 
                                value={manualConfig.dataKey}
                                onChange={(e) => setManualConfig({...manualConfig, dataKey: e.target.value})}
                                className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="">Metric (Y)</option>
                                <option value="count">Record Count</option>
                                {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <select 
                                value={manualConfig.xAxisKey}
                                onChange={(e) => setManualConfig({...manualConfig, xAxisKey: e.target.value})}
                                className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                disabled={manualConfig.type === 'kpi'}
                            >
                                <option value="">Group By (X)</option>
                                {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>

                          <select 
                              value={manualConfig.aggregation} 
                              onChange={(e) => setManualConfig({...manualConfig, aggregation: e.target.value as any})}
                              className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                              disabled={manualConfig.type === 'scatter' || manualConfig.type === 'boxplot'}
                          >
                              <option value="sum">Sum</option>
                              <option value="average">Average</option>
                              <option value="count">Count</option>
                              <option value="none">None (Raw)</option>
                          </select>

                          <button
                              onClick={handleAddManualChart}
                              disabled={!manualConfig.title || !manualConfig.dataKey || (manualConfig.type !== 'kpi' && !manualConfig.xAxisKey)}
                              className="mt-2 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                              <Plus size={16} /> Add Widget
                          </button>
                      </div>
                  )}
               </div>
           </div>
        </div>

        <div className="flex justify-center pt-6">
          <button
            onClick={handleBuildDashboard}
            disabled={selectedIndices.size === 0}
            className="bg-indigo-600 text-white px-10 py-4 rounded-xl hover:bg-indigo-700 font-bold text-lg shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
          >
            Launch Vision Board <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // --- DASHBOARD MODE RENDER ---
  const kpiConfigs = finalConfig.filter(c => c.type === 'kpi');
  const chartConfigs = finalConfig.filter(c => c.type !== 'kpi');
  const kpisVisible = visibleWidgets > 0;
  const visibleChartsCount = Math.max(0, visibleWidgets - 1); 
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layout className="text-indigo-600" /> Vision Board
          </h2>
          <p className="text-slate-500">
             {isBuilding ? 'Constructing visual analytics...' : `Real-time analytics for: ${goal}`}
          </p>
        </div>
        
        {/* Filter Bar */}
        {!isBuilding && filterableColumns.length > 0 && (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                <div className="px-2 text-slate-500 flex items-center gap-2 text-sm font-semibold">
                    <Filter size={16} className="text-indigo-600" /> Filter View:
                </div>
                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                <select 
                    value={filterCol}
                    onChange={(e) => { setFilterCol(e.target.value); setFilterVal(''); }}
                    className="bg-slate-50 border-none rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-100 cursor-pointer py-1.5 font-medium"
                >
                    <option value="">Select Field...</option>
                    {filterableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                
                {filterCol && (
                    <select
                        value={filterVal}
                        onChange={(e) => setFilterVal(e.target.value)}
                        className="bg-indigo-50 text-indigo-700 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-100 cursor-pointer min-w-[120px] py-1.5"
                    >
                        <option value="">All</option>
                        {filterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                )}
            </div>
        )}
      </div>

      {/* KPIs Section */}
      {kpiConfigs.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ${kpisVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {kpiConfigs.map((cfg, idx) => (
             <div key={`kpi-${idx}`}>{renderWidget(cfg, idx)}</div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartConfigs.map((cfg, idx) => (
          <div 
            key={`chart-${idx}`}
            className={`transition-all duration-700 ease-out ${idx < visibleChartsCount ? 'opacity-100 scale-100' : 'opacity-0 scale-95 hidden'}`}
          >
            {renderWidget(cfg, idx + kpiConfigs.length)} 
          </div>
        ))}
      </div>
      
      {!isBuilding && finalConfig.length === 0 && (
        <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
           <Grip size={48} className="mx-auto mb-4 text-slate-300" />
           <p>No widgets configured. Please restart dashboard generation.</p>
        </div>
      )}

      {/* Explanation Modal */}
      {explanationState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Activity size={18} className="text-indigo-600" />
                 Metric Intelligence
              </h3>
              <button onClick={closeExplanation} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <h4 className="text-lg font-bold text-slate-800 mb-3">{explanationState.title}</h4>
              <div className="text-slate-600 leading-relaxed text-sm">
                {explanationState.loading ? (
                   <div className="flex flex-col items-center py-8 gap-3">
                     <Loader2 size={32} className="text-indigo-500 animate-spin" />
                     <p className="text-sm text-slate-400">AI is analyzing {filterVal ? `filtered data (${filterVal})` : 'global data'}...</p>
                   </div>
                ) : (
                  <div className="prose prose-sm prose-indigo">
                    {explanationState.content}
                    {filterVal && filterVal !== 'All' && (
                        <p className="text-xs text-indigo-500 font-semibold mt-4 border-t pt-2 border-indigo-100">
                            * Analysis based on filtered view: {filterCol} = {filterVal}
                        </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button 
                 onClick={closeExplanation}
                 className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-sm font-medium"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const KPICard = ({ title, value, icon, bg, onInfoClick, onAddClick }: { title: string, value: string, icon: React.ReactNode, bg: string, onInfoClick: (e: React.MouseEvent) => void, onAddClick: () => void }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group relative hover:shadow-lg hover:border-indigo-100 transition-all duration-300">
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
        onClick={onAddClick}
        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-1 transition-colors"
        title="Add to Report"
        >
        <Plus size={16} />
        </button>
        <button 
        onClick={onInfoClick}
        className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded p-1 transition-colors"
        >
        <Info size={16} />
        </button>
    </div>
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
    <div className={`p-3 rounded-xl ${bg}`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;