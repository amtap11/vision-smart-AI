
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, FileText, Plus, X, GitMerge, TrendingUp, Sparkles, Loader2, Calculator, ArrowRight, Wand2, ArrowDownUp, Split, Combine, CheckCircle2, Layers, PlayCircle, Lightbulb, Sigma, Search, LineChart as LineChartIcon, BoxSelect, Info, HelpCircle, Grid, Clock, Share2, ScatterChart as ScatterIcon, Settings2, MessageSquare, Bot, Send, Download, Scissors, Table2, Trash2, Filter } from 'lucide-react';
import { parseCSV, generateDatasetSummary, calculatePearsonCorrelation, joinDatasets, unionDatasets, applyTransformation, trainRegressionModel, prepareMultiSourceData, calculateCorrelationMatrix, computeKMeans, computeForecast, exportToCSV, dropColumn, removeRowsWithMissing, createSample, filterDataset } from '../services/dataService';
import { analyzeCrossFilePatterns, suggestTransformations, suggestMergeStrategy, suggestStatisticalAnalyses, getModelAdvisorResponse, suggestClusteringSetup, suggestForecastingSetup, explainStatistic } from '../services/geminiService';
import { Dataset, PatientRecord, TransformationSuggestion, StatisticalSuggestion, RegressionModel, CorrelationMatrix, ClusterResult, ForecastResult, ChatMessage, ReportItem } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine, LineChart, Cell, Legend } from 'recharts';
import DataStudio from './DataStudio';

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9'];

// Static constants for Recharts stability
const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };
const AXIS_LABEL_STYLE = { fontSize: 10 };
const TOOLTIP_CURSOR_SCATTER = { strokeDasharray: '3 3' };

interface MultiFileAnalysisProps {
  datasets: Dataset[];
  onUpdateDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
  onAnalyzeDataset?: (dataset: Dataset) => void;
  onAddToReport?: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

// Dynamic Info Icon with AI Explanation
function AIInfoIcon({ type, context }: { type: 'regression' | 'clustering' | 'correlation' | 'forecast', context: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Create a unique key based on type and context to identify this instance
    const contextKey = useMemo(() => {
        if (!context) return `${type}-empty`;
        // Create a unique identifier from context
        const contextStr = JSON.stringify(context);
        return `${type}-${contextStr.substring(0, 50)}`;
    }, [type, context]);
    
    // Reset explanation when type or context changes
    useEffect(() => {
        setExplanation(null);
        setIsOpen(false);
        setLoading(false);
    }, [contextKey]);

    const handleClick = async () => {
        setIsOpen(!isOpen);
        // Always regenerate if opening and no explanation exists for this specific context
        if (isOpen === false && !explanation && !loading) {
            setLoading(true);
            try {
                const text = await explainStatistic(type, context);
                setExplanation(text);
            } catch (error) {
                console.error('Error generating explanation:', error);
                setExplanation('Failed to generate explanation. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="relative inline-block ml-2">
            <button 
                onClick={handleClick} 
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50"
                aria-label="Show AI explanation"
            >
                <Info size={16} />
            </button>
            {isOpen && (
                <>
                    {/* Backdrop to close on outside click */}
                    <div 
                        className="fixed inset-0 z-[9998]" 
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Popup - positioned below */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white text-slate-700 text-xs rounded-xl shadow-2xl border border-slate-200 z-[9999] animate-in zoom-in-95 fade-in">
                        {/* Header - fixed */}
                        <div className="flex justify-between items-start p-4 pb-3 border-b border-slate-100">
                            <h4 className="font-bold flex items-center gap-1 text-indigo-700">
                                <Sparkles size={12}/> AI Insight
                            </h4>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-100"
                                aria-label="Close"
                            >
                                <X size={12}/>
                            </button>
                        </div>
                        {/* Content - scrollable */}
                        <div className="p-4 max-h-64 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Loader2 className="animate-spin" size={12}/> Analyzing results...
                                </div>
                            ) : (
                                <p className="leading-relaxed text-sm">{explanation || 'Click to load AI explanation'}</p>
                            )}
                        </div>
                        {/* Arrow pointer pointing up */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
                            <div className="border-8 border-transparent border-b-white"></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-200 mb-px"></div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

type AnalyticsMode = 'regression' | 'clustering' | 'correlation' | 'forecast';

const MultiFileAnalysis: React.FC<MultiFileAnalysisProps> = ({ datasets, onUpdateDatasets, onAnalyzeDataset, onAddToReport }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'studio'>('analysis');
  const [loadingFile, setLoadingFile] = useState(false);
  
  // AI State
  const [aiInsights, setAiInsights] = useState<string>('');
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);

  // Workbench State
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>('regression');

  // --- CHAT ADVISOR STATE ---
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { id: '1', role: 'ai', text: 'Hello! I am your AI Model Advisor. I can configure models and run analysis for you. Just say "Run clustering on Age and Income".', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAdvisorThinking, setIsAdvisorThinking] = useState(false);
  
  // Ref for auto-scrolling
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- REGRESSION STATE ---
  const [predTargetDatasetId, setPredTargetDatasetId] = useState('');
  const [predTargetCol, setPredTargetCol] = useState('');
  const [predJoinKey, setPredJoinKey] = useState('');
  const [predFeatures, setPredFeatures] = useState<{ datasetId: string, col: string }[]>([]);
  const [trainedModel, setTrainedModel] = useState<RegressionModel | null>(null);
  const [predictionInputs, setPredictionInputs] = useState<Record<string, string>>({});
  const [predictedValue, setPredictedValue] = useState<number | null>(null);

  // --- CLUSTERING STATE ---
  const [clusterDsId, setClusterDsId] = useState('');
  const [clusterX, setClusterX] = useState('');
  const [clusterY, setClusterY] = useState('');
  const [kValue, setKValue] = useState(3);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);

  // --- CORRELATION STATE ---
  const [corrDsId, setCorrDsId] = useState('');
  const [corrMatrix, setCorrMatrix] = useState<CorrelationMatrix | null>(null);

  // --- FORECAST STATE ---
  const [forecastDsId, setForecastDsId] = useState('');
  const [forecastDateCol, setForecastDateCol] = useState('');
  const [forecastValueCol, setForecastValueCol] = useState('');
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);

  // --- DATA STUDIO STATES ---
  const [shapingDsId, setShapingDsId] = useState('');
  
  // Scroll chat to bottom
  useEffect(() => {
      if (showChat) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatMessages, showChat]);

  // --- COMMON HELPERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setLoadingFile(true);
        const files = Array.from(e.target.files) as File[];
        try {
            const promises = files.map(async (file) => {
                try {
                   const data = await parseCSV(file);
                   return {
                       id: Math.random().toString(36).substr(2, 9),
                       name: file.name,
                       data: data,
                       color: '' 
                   } as Dataset;
                } catch(error) {
                    console.error(`Error parsing ${file.name}`, error);
                    return null;
                }
            });
            const results = await Promise.all(promises);
            const valid = results.filter((d): d is Dataset => d !== null);
            if (valid.length > 0) {
                // Use functional update to prevent race conditions and ensure correct color cycling
                onUpdateDatasets(prev => {
                    const updated = [...prev];
                    valid.forEach((d, idx) => {
                        d.color = COLORS[(prev.length + idx) % COLORS.length];
                        updated.push(d);
                    });
                    return updated;
                });
                
                // Initial Advisor Prompt
                addChatMessage('ai', `I see you loaded ${valid.length} file(s). Ask me to find correlations or build models.`);
                setShowChat(true); 
                // Set initial shaping dataset if none selected
                if (!shapingDsId && valid.length > 0) setShapingDsId(valid[0].id);
            } else { alert("Could not parse files."); }
        } catch (error) { alert("Error uploading files"); } finally { setLoadingFile(false); e.target.value = ''; }
    }
  };

  const removeDataset = (id: string) => {
      onUpdateDatasets(prev => prev.filter(d => d.id !== id));
      if (shapingDsId === id) setShapingDsId('');
  };

  const getNumericColumns = (datasetId: string) => {
      const ds = datasets.find(d => d.id === datasetId);
      if (!ds || ds.data.length === 0) return [];
      const keys = Object.keys(ds.data[0]);
      return keys.filter(k => {
          const sample = ds.data.slice(0, 50).find(row => row[k] !== null && row[k] !== undefined && row[k] !== '');
          return sample && typeof sample[k] === 'number';
      });
  };

  const getDateColumns = (datasetId: string) => {
      const ds = datasets.find(d => d.id === datasetId);
      if (!ds || ds.data.length === 0) return [];
      const keys = Object.keys(ds.data[0]);
      return keys.filter(k => {
          const sample = ds.data.slice(0, 50).find(row => row[k] !== null && row[k] !== undefined && row[k] !== '');
          const val = sample ? sample[k] : null;
          if (!val) return false;
          return k.toLowerCase().includes('date') || (typeof val === 'string' && !isNaN(Date.parse(val)) && val.length > 5 && /\d/.test(val));
      });
  };

  const handleAnalyzeSolo = (ds: Dataset) => {
      setShapingDsId(ds.id);
      setActiveTab('studio');
      if (onAnalyzeDataset) {
          onAnalyzeDataset(ds);
      }
  };

  // --- ADVISOR LOGIC ---
  const addChatMessage = (role: 'user' | 'ai', text: string) => {
      setChatMessages(prev => [...prev, { id: Date.now().toString(), role, text, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      const userText = chatInput;
      addChatMessage('user', userText);
      setChatInput('');
      setIsAdvisorThinking(true);

      const datasetContext = datasets.map(d => ({
          id: d.id, 
          name: d.name, 
          columns: Object.keys(d.data[0] || {}) 
      }));
      
      let lastResult = null;
      if (analyticsMode === 'regression') lastResult = trainedModel;
      else if (analyticsMode === 'clustering') lastResult = clusterResult;
      else if (analyticsMode === 'correlation') lastResult = corrMatrix;
      else if (analyticsMode === 'forecast') lastResult = forecastResult;

      const aiResponse = await getModelAdvisorResponse(userText, {
          currentTool: analyticsMode,
          datasets: datasetContext,
          lastResult: lastResult
      });

      addChatMessage('ai', aiResponse.text);
      if (aiResponse.action) {
          await executeAgentAction(aiResponse.action);
      }
      
      setIsAdvisorThinking(false);
  };

  const executeAgentAction = async (action: { type: string, payload: any }) => {
      switch (action.type) {
          case 'SET_MODE':
              setAnalyticsMode(action.payload);
              break;
          case 'CONFIG_CLUSTERING':
              if (action.payload.dsId) setClusterDsId(action.payload.dsId);
              if (action.payload.x) setClusterX(action.payload.x);
              if (action.payload.y) setClusterY(action.payload.y);
              if (action.payload.k) setKValue(action.payload.k);
              break;
          case 'CONFIG_FORECAST':
              if (action.payload.dsId) setForecastDsId(action.payload.dsId);
              if (action.payload.dateCol) setForecastDateCol(action.payload.dateCol);
              if (action.payload.valueCol) setForecastValueCol(action.payload.valueCol);
              break;
          case 'CONFIG_REGRESSION':
              if (action.payload.targetDsId) setPredTargetDatasetId(action.payload.targetDsId);
              if (action.payload.targetCol) setPredTargetCol(action.payload.targetCol);
              if (action.payload.features) setPredFeatures(action.payload.features);
              break;
          case 'RUN_ANALYSIS':
              setTimeout(() => {
                  if (analyticsMode === 'clustering') handleRunClustering();
                  if (analyticsMode === 'forecast') handleRunForecast();
                  if (analyticsMode === 'regression') handleTrainModel();
                  if (analyticsMode === 'correlation') handleRunCorrelation();
              }, 100);
              break;
          default:
              console.warn("Unknown agent action:", action.type);
      }
  };

  // --- ANALYTICS HANDLERS ---

  const handleTrainModel = () => {
      if (!predTargetDatasetId || !predTargetCol || predFeatures.length === 0) return;
      const distinctDsIds = new Set(predFeatures.map(f => f.datasetId));
      distinctDsIds.add(predTargetDatasetId);
      if (distinctDsIds.size > 1 && !predJoinKey) { alert("Multiple files selected. Please provide a Common Join Key."); return; }

      const preparedData = prepareMultiSourceData(datasets, { datasetId: predTargetDatasetId, col: predTargetCol }, predFeatures, predJoinKey);
      if (!preparedData || preparedData.length < 5) { alert("Insufficient matching data found."); return; }

      const featureKeys = predFeatures.map(f => f.datasetId === predTargetDatasetId && distinctDsIds.size === 1 ? f.col : `${f.datasetId}_${f.col}`);
      const model = trainRegressionModel(preparedData, predTargetCol, featureKeys);
      setTrainedModel(model);
      setPredictionInputs({});
      setPredictedValue(null);
      addChatMessage('ai', `Regression Model trained! R-Squared is ${model?.rSquared.toFixed(3)}. I've analyzed the coefficients for ${featureKeys.join(', ')}.`);
  };

  const handlePredict = () => {
      if (!trainedModel) return;
      let y = trainedModel.intercept;
      trainedModel.featureColumns.forEach(f => {
          const val = Number(predictionInputs[f] || 0);
          y += val * trainedModel.coefficients[f];
      });
      setPredictedValue(y);
  };

  const toggleFeature = (datasetId: string, col: string) => {
      setPredFeatures(prev => {
          const exists = prev.find(p => p.datasetId === datasetId && p.col === col);
          return exists ? prev.filter(p => p !== exists) : [...prev, { datasetId, col }];
      });
  };

  const handleRunClustering = () => {
      if (!clusterDsId || !clusterX || !clusterY) return;
      const ds = datasets.find(d => d.id === clusterDsId);
      if (!ds) return;
      
      const result = computeKMeans(ds.data, clusterX, clusterY, kValue);
      setClusterResult(result);
      addChatMessage('ai', `K-Means clustering complete with K=${kValue}. Do the groups make sense visually?`);
  };

  const handleRunCorrelation = () => {
      if (!corrDsId) return;
      const ds = datasets.find(d => d.id === corrDsId);
      if (!ds) return;
      
      const numCols = getNumericColumns(corrDsId);
      const matrix = calculateCorrelationMatrix(ds.data, numCols);
      setCorrMatrix(matrix);
      addChatMessage('ai', `Correlation matrix generated. Look for dark blue (positive) or red (negative) squares for strong relationships.`);
  };

  const handleRunForecast = () => {
      if (!forecastDsId || !forecastDateCol || !forecastValueCol) return;
      const ds = datasets.find(d => d.id === forecastDsId);
      if (!ds) return;

      const result = computeForecast(ds.data, forecastDateCol, forecastValueCol, 6); // 6 periods default
      setForecastResult(result);
      addChatMessage('ai', `Forecast generated showing a ${(result?.growthRate || 0) > 0 ? 'positive' : 'negative'} trend. The yellow area indicates uncertainty.`);
  };

  // --- AI SUGGESTION HANDLERS ---
  const handleAiSuggestClustering = async () => {
      if (datasets.length === 0) return;
      const ds = datasets[0]; 
      const numeric = getNumericColumns(ds.id);
      const summary = generateDatasetSummary(ds.data).substring(0, 500);
      
      const suggestion = await suggestClusteringSetup(summary, numeric);
      setClusterDsId(ds.id);
      setClusterX(suggestion.x);
      setClusterY(suggestion.y);
      setKValue(suggestion.k);
      addChatMessage('ai', `I suggest clustering '${suggestion.x}' vs '${suggestion.y}' with K=${suggestion.k}. Reason: ${suggestion.reasoning}`);
  };

  const handleAiSuggestForecast = async () => {
      if (datasets.length === 0) return;
      const ds = datasets[0];
      const numeric = getNumericColumns(ds.id);
      const dates = getDateColumns(ds.id);
      const summary = generateDatasetSummary(ds.data).substring(0, 500);

      const suggestion = await suggestForecastingSetup(summary, dates, numeric);
      setForecastDsId(ds.id);
      setForecastDateCol(suggestion.dateCol);
      setForecastValueCol(suggestion.valueCol);
      addChatMessage('ai', `I suggest forecasting '${suggestion.valueCol}' over '${suggestion.dateCol}'. Reason: ${suggestion.reasoning}`);
  };

  const addToReport = (title: string, data: any, config: any) => {
      if (onAddToReport) {
          onAddToReport({
              type: 'chart',
              title: `Advanced Analytics: ${title}`,
              content: { config, data, filterContext: "Advanced Statistical Analysis" }
          });
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 flex-shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <GitMerge className="text-indigo-600" /> Advanced Analytics Studio
                </h2>
                <p className="text-slate-500">
                    Combine, transform, and analyze multiple datasets with advanced statistical tools.
                </p>
            </div>
            
            <div className="flex gap-2">
                <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors cursor-pointer flex items-center gap-2">
                    {loadingFile ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    <span>Load CSVs</span>
                    <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" disabled={loadingFile} />
                </label>
            </div>
        </div>

        {/* Tab Navigation */}
        {datasets.length > 0 && (
            <div className="flex border-b border-slate-200 flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'analysis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Calculator size={16} /> Statistical Workbench
                </button>
                <button 
                    onClick={() => setActiveTab('studio')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'studio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Wand2 size={16} /> Data Studio
                </button>
            </div>
        )}

        {/* File Cards */}
        {datasets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <FileText size={48} className="mx-auto text-slate-300 mb-2"/>
                <p className="text-slate-500 font-medium">No datasets loaded.</p>
                <p className="text-xs text-slate-400">Upload CSV files to begin advanced analysis.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
                {datasets.map(ds => (
                    <div key={ds.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={() => exportToCSV(ds.data, ds.name)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Export as CSV">
                                <Download size={16}/>
                            </button>
                            <button onClick={() => removeDataset(ds.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <X size={16}/>
                            </button>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">CSV</div>
                            <div className="truncate font-semibold text-slate-700 w-32" title={ds.name}>{ds.name}</div>
                        </div>
                        <div className="text-xs text-slate-500 flex justify-between mb-3">
                            <span>{ds.data.length} Rows</span>
                            <span>{Object.keys(ds.data[0] || {}).length} Cols</span>
                        </div>
                        <button onClick={() => handleAnalyzeSolo(ds)} className="w-full py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                            <PlayCircle size={14} /> Analyze Solo
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW: STATISTICAL WORKBENCH --- */}
        {activeTab === 'analysis' && datasets.length > 0 && (
            <div className="flex gap-6 h-full min-h-[600px] relative">
                {/* LEFT: Tool Selection */}
                <div className="w-80 flex-shrink-0 space-y-6 flex flex-col">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setAnalyticsMode('regression')} className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'regression' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:border-purple-200 bg-white'}`}>
                            <Sigma className={`mb-2 ${analyticsMode === 'regression' ? 'text-purple-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Predictive</div>
                            <div className="text-[10px] text-slate-500">Regression</div>
                        </button>
                        <button onClick={() => setAnalyticsMode('clustering')} className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'clustering' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200 bg-white'}`}>
                            <ScatterIcon className={`mb-2 ${analyticsMode === 'clustering' ? 'text-emerald-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Clustering</div>
                            <div className="text-[10px] text-slate-500">K-Means</div>
                        </button>
                        <button onClick={() => setAnalyticsMode('correlation')} className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'correlation' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-200 bg-white'}`}>
                            <Grid className={`mb-2 ${analyticsMode === 'correlation' ? 'text-blue-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Correlation</div>
                            <div className="text-[10px] text-slate-500">Heatmap</div>
                        </button>
                        <button onClick={() => setAnalyticsMode('forecast')} className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'forecast' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-200 bg-white'}`}>
                            <TrendingUp className={`mb-2 ${analyticsMode === 'forecast' ? 'text-amber-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Forecasting</div>
                            <div className="text-[10px] text-slate-500">Time-Series</div>
                        </button>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2 flex-1">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-slate-400" />
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{analyticsMode} Config</h3>
                            </div>
                            {(analyticsMode === 'clustering' || analyticsMode === 'forecast') && (
                                <button onClick={analyticsMode === 'clustering' ? handleAiSuggestClustering : handleAiSuggestForecast} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                                    <Sparkles size={10} /> Auto-Fill
                                </button>
                            )}
                        </div>

                        {analyticsMode === 'regression' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Target (Y)</label>
                                    <div className="flex gap-2 mt-1">
                                        <select className="flex-1 p-2 border rounded text-xs bg-slate-50" value={predTargetDatasetId} onChange={(e) => setPredTargetDatasetId(e.target.value)}>
                                            <option value="">Dataset...</option>
                                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <select className="flex-1 p-2 border rounded text-xs" value={predTargetCol} onChange={(e) => setPredTargetCol(e.target.value)}>
                                            <option value="">Column...</option>
                                            {getNumericColumns(predTargetDatasetId).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto border rounded p-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Features (X)</label>
                                    {datasets.map(ds => (
                                        <div key={ds.id} className="mb-2">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{ds.name}</div>
                                            {getNumericColumns(ds.id).filter(c => ds.id !== predTargetDatasetId || c !== predTargetCol).map(c => (
                                                <div key={`${ds.id}-${c}`} className="flex items-center gap-2">
                                                    <input type="checkbox" checked={predFeatures.some(f => f.datasetId === ds.id && f.col === c)} onChange={() => toggleFeature(ds.id, c)} className="text-purple-600"/>
                                                    <span className="text-xs text-slate-600">{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                {new Set(predFeatures.map(f => f.datasetId).concat(predTargetDatasetId ? [predTargetDatasetId] : [])).size > 1 && (
                                    <input placeholder="Common Join Key (e.g. ID, Date)" value={predJoinKey} onChange={(e) => setPredJoinKey(e.target.value)} className="w-full p-2 border rounded text-xs"/>
                                )}
                                <button onClick={handleTrainModel} className="w-full py-2 bg-purple-600 text-white rounded font-bold text-xs hover:bg-purple-700">Train Model</button>
                            </div>
                        )}

                        {analyticsMode === 'clustering' && (
                            <div className="space-y-4">
                                <select className="w-full p-2 border rounded text-xs bg-slate-50" value={clusterDsId} onChange={(e) => setClusterDsId(e.target.value)}>
                                    <option value="">Select Dataset...</option>
                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <select className="w-full p-2 border rounded text-xs" value={clusterX} onChange={(e) => setClusterX(e.target.value)}>
                                        <option value="">X Axis...</option>
                                        {getNumericColumns(clusterDsId).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select className="w-full p-2 border rounded text-xs" value={clusterY} onChange={(e) => setClusterY(e.target.value)}>
                                        <option value="">Y Axis...</option>
                                        {getNumericColumns(clusterDsId).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Number of Clusters (K): {kValue}</label>
                                    <input type="range" min="2" max="8" value={kValue} onChange={(e) => setKValue(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                                </div>
                                <button onClick={handleRunClustering} className="w-full py-2 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-700">Run K-Means</button>
                            </div>
                        )}

                        {analyticsMode === 'correlation' && (
                            <div className="space-y-4">
                                <select className="w-full p-2 border rounded text-xs bg-slate-50" value={corrDsId} onChange={(e) => setCorrDsId(e.target.value)}>
                                    <option value="">Select Dataset...</option>
                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <button onClick={handleRunCorrelation} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-700">Generate Heatmap</button>
                            </div>
                        )}

                        {analyticsMode === 'forecast' && (
                            <div className="space-y-4">
                                <select className="w-full p-2 border rounded text-xs bg-slate-50" value={forecastDsId} onChange={(e) => setForecastDsId(e.target.value)}>
                                    <option value="">Select Dataset...</option>
                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <select className="w-full p-2 border rounded text-xs" value={forecastDateCol} onChange={(e) => setForecastDateCol(e.target.value)}>
                                    <option value="">Date Column...</option>
                                    {getDateColumns(forecastDsId).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="w-full p-2 border rounded text-xs" value={forecastValueCol} onChange={(e) => setForecastValueCol(e.target.value)}>
                                    <option value="">Value Column...</option>
                                    {getNumericColumns(forecastDsId).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={handleRunForecast} className="w-full py-2 bg-amber-600 text-white rounded font-bold text-xs hover:bg-amber-700">Run Forecast</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Results Area */}
                <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            {analyticsMode === 'regression' && <Sigma className="text-purple-600" />}
                            {analyticsMode === 'clustering' && <ScatterIcon className="text-emerald-600" />}
                            {analyticsMode === 'correlation' && <Grid className="text-blue-600" />}
                            {analyticsMode === 'forecast' && <TrendingUp className="text-amber-600" />}
                            Analysis Results
                            <AIInfoIcon type={analyticsMode} context={trainedModel || clusterResult || corrMatrix || forecastResult} />
                        </h3>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {analyticsMode === 'regression' && trainedModel ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-purple-50 rounded-lg text-center border border-purple-100">
                                        <div className="text-2xl font-bold text-purple-700">{trainedModel.rSquared.toFixed(3)}</div>
                                        <div className="text-xs text-purple-500 font-bold uppercase">R-Squared</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                                        <div className="text-2xl font-bold text-slate-700">{trainedModel.mae.toFixed(2)}</div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">Mean Abs Error</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                                        <div className="text-2xl font-bold text-slate-700">{trainedModel.intercept.toFixed(2)}</div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">Intercept</div>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer>
                                        <ScatterChart margin={CHART_MARGIN}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="actual" name="Actual" label={{ value: 'Actual', position: 'bottom', ...AXIS_LABEL_STYLE }} tick={AXIS_LABEL_STYLE} />
                                            <YAxis type="number" dataKey="predicted" name="Predicted" label={{ value: 'Predicted', angle: -90, position: 'left', ...AXIS_LABEL_STYLE }} tick={AXIS_LABEL_STYLE} />
                                            <Tooltip cursor={TOOLTIP_CURSOR_SCATTER} />
                                            <Scatter name="Prediction" data={trainedModel.predictionData} fill="#8884d8" />
                                            <Line dataKey="actual" data={[{actual: 0, predicted: 0}, {actual: Math.max(...trainedModel.predictionData.map(p=>p.actual)), predicted: Math.max(...trainedModel.predictionData.map(p=>p.actual))}]} stroke="#ff7300" strokeDasharray="3 3" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <button onClick={() => addToReport('Regression Model', trainedModel, { type: 'scatter', title: 'Actual vs Predicted' })} className="text-xs flex items-center gap-1 text-slate-400 hover:text-purple-600"><Plus size={12}/> Add to Report</button>
                            </div>
                        ) : analyticsMode === 'clustering' && clusterResult ? (
                            <div className="space-y-4">
                                <div className="h-96 w-full">
                                    <ResponsiveContainer>
                                        <ScatterChart margin={CHART_MARGIN}>
                                            <CartesianGrid />
                                            <XAxis type="number" dataKey="x" name={clusterX} label={{ value: clusterX, position: 'bottom', ...AXIS_LABEL_STYLE }} tick={AXIS_LABEL_STYLE} />
                                            <YAxis type="number" dataKey="y" name={clusterY} label={{ value: clusterY, angle: -90, position: 'left', ...AXIS_LABEL_STYLE }} tick={AXIS_LABEL_STYLE} />
                                            <Tooltip cursor={TOOLTIP_CURSOR_SCATTER} />
                                            {clusterResult.clusters.map((cluster, i) => (
                                                <Scatter key={i} name={`Cluster ${i+1}`} data={cluster.points} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex gap-4">
                                    {clusterResult.clusters.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                            <span>Cluster {i+1}: <b>{c.points.length}</b> points</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => addToReport('Clustering Result', clusterResult, { type: 'scatter', title: `K-Means (k=${kValue})` })} className="text-xs flex items-center gap-1 text-slate-400 hover:text-emerald-600"><Plus size={12}/> Add to Report</button>
                            </div>
                        ) : analyticsMode === 'correlation' && corrMatrix ? (
                             <div className="overflow-auto">
                                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${corrMatrix.columns.length}, minmax(40px, 1fr))` }}>
                                    <div></div>
                                    {corrMatrix.columns.map(c => <div key={c} className="text-[10px] font-bold text-slate-500 -rotate-45 h-20 flex items-end justify-center pb-2">{c.substring(0, 10)}</div>)}
                                    {corrMatrix.matrix.map((row, i) => (
                                        <React.Fragment key={i}>
                                            <div className="text-[10px] font-bold text-slate-500 pr-2 flex items-center justify-end">{corrMatrix.columns[i].substring(0, 10)}</div>
                                            {row.map((val, j) => (
                                                <div key={j} className="h-10 border border-white flex items-center justify-center text-[9px] font-bold text-white transition-all hover:scale-110"
                                                     style={{ backgroundColor: val > 0 ? `rgba(59, 130, 246, ${Math.abs(val)})` : `rgba(239, 68, 68, ${Math.abs(val)})` }}>
                                                    {val.toFixed(2)}
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <button onClick={() => addToReport('Correlation Matrix', corrMatrix, { type: 'heatmap', title: 'Feature Correlation' })} className="mt-4 text-xs flex items-center gap-1 text-slate-400 hover:text-blue-600"><Plus size={12}/> Add to Report</button>
                             </div>
                        ) : analyticsMode === 'forecast' && forecastResult ? (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-100 flex-1">
                                        <div className="text-xl font-bold text-amber-700">{(forecastResult.growthRate * 100).toFixed(1)}%</div>
                                        <div className="text-xs text-amber-500 font-bold uppercase">Proj. Growth</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-100 flex-1">
                                        <div className="text-xl font-bold text-slate-700 capitalize">{forecastResult.trend}</div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">Trend Direction</div>
                                    </div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer>
                                        <LineChart margin={CHART_MARGIN}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={AXIS_LABEL_STYLE} />
                                            <YAxis tick={AXIS_LABEL_STYLE} />
                                            <Tooltip />
                                            <Legend />
                                            <Line name="Historical" data={forecastResult.historical} dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} />
                                            <Line name="Forecast" data={forecastResult.forecast} dataKey="value" stroke="#f59e0b" strokeDasharray="5 5" dot={{r:3}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <button onClick={() => addToReport('Forecast', forecastResult, { type: 'line', title: 'Future Trend Projection' })} className="text-xs flex items-center gap-1 text-slate-400 hover:text-amber-600"><Plus size={12}/> Add to Report</button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <Search size={48} className="mb-2 opacity-50"/>
                                <p>Configure settings and run analysis to see results.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Chat Advisor */}
                <div className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-500 ${showChat ? 'h-[500px] translate-y-0 opacity-100' : 'h-0 translate-y-12 opacity-0 overflow-hidden pointer-events-none'}`}>
                    <div className="p-4 bg-slate-900 text-white rounded-t-2xl flex justify-between items-center cursor-pointer" onClick={() => setShowChat(false)}>
                        <h3 className="font-bold flex items-center gap-2"><Bot size={18}/> AI Model Advisor</h3>
                        <X size={16}/>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {chatMessages.map(m => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isAdvisorThinking && (
                             <div className="flex justify-start"><div className="bg-white p-3 rounded-xl rounded-bl-none shadow-sm border border-slate-200"><Loader2 className="animate-spin text-slate-400" size={16}/></div></div>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask me to run a model..."
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button onClick={handleSendMessage} disabled={isAdvisorThinking} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"><Send size={16}/></button>
                    </div>
                </div>
                {!showChat && (
                    <button onClick={() => setShowChat(true)} className="fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-50">
                        <MessageSquare size={24} />
                    </button>
                )}
            </div>
        )}

        {/* --- VIEW: DATA STUDIO --- */}
        {activeTab === 'studio' && datasets.length > 0 && (
            <DataStudio 
                datasets={datasets} 
                activeDatasetId={shapingDsId || (datasets[0]?.id)} 
                onUpdateDatasets={onUpdateDatasets} 
                onAnalyzeDataset={(id) => console.log('Analyze requested for', id)} 
            />
        )}
    </div>
  );
};

export default MultiFileAnalysis;
