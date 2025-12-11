
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, FileText, Plus, X, GitMerge, TrendingUp, Sparkles, Loader2, Calculator, ArrowRight, Wand2, ArrowDownUp, Split, Combine, CheckCircle2, Layers, PlayCircle, Lightbulb, Sigma, ScanSearch, LineChart as LineChartIcon, BoxSelect, Info, HelpCircle, Grid, Grid3X3, Clock, Share2, ScatterChart as ScatterIcon, Settings2, MessageSquare, Bot, Send, Download, Scissors, Table2, Trash2, Filter } from 'lucide-react';
import { parseCSV, generateDatasetSummary, calculatePearsonCorrelation, joinDatasets, unionDatasets, applyTransformation, trainRegressionModel, prepareMultiSourceData, calculateCorrelationMatrix, computeKMeans, computeForecast, exportToCSV, dropColumn, removeRowsWithMissing, createSample, filterDataset } from '../services/dataService';
import { analyzeCrossFilePatterns, suggestTransformations, suggestMergeStrategy, suggestStatisticalAnalyses, getModelAdvisorResponse, suggestClusteringSetup, suggestForecastingSetup, explainStatistic } from '../services/geminiService';
import { Dataset, PatientRecord, TransformationSuggestion, StatisticalSuggestion, RegressionModel, CorrelationMatrix, ClusterResult, ForecastResult, ChatMessage, ReportItem } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine, LineChart, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#0ea5e9'];

interface MultiFileAnalysisProps {
  onAnalyzeDataset?: (dataset: Dataset) => void;
  onAddToReport?: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

// Dynamic Info Icon with AI Explanation
const AIInfoIcon: React.FC<{ type: 'regression' | 'clustering' | 'correlation' | 'forecast', context: any }> = ({ type, context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setIsOpen(!isOpen);
        if (!explanation && !loading) {
            setLoading(true);
            const text = await explainStatistic(type, context);
            setExplanation(text);
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-block ml-2">
            <button onClick={handleClick} className="text-slate-400 hover:text-indigo-600 transition-colors">
                <Info size={16} />
            </button>
            {isOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white text-slate-700 text-xs p-4 rounded-xl shadow-xl border border-slate-200 z-50 animate-in zoom-in-95">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold flex items-center gap-1 text-indigo-700"><Sparkles size={12}/> AI Insight</h4>
                        <button onClick={() => setIsOpen(false)}><X size={12}/></button>
                    </div>
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={12}/> Analyzing results...</div>
                    ) : (
                        <p className="leading-relaxed">{explanation}</p>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white drop-shadow-sm"></div>
                </div>
            )}
        </div>
    );
};

type AnalyticsMode = 'regression' | 'clustering' | 'correlation' | 'forecast';

const MultiFileAnalysis: React.FC<MultiFileAnalysisProps> = ({ onAnalyzeDataset, onAddToReport }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'studio'>('analysis');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
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
  
  // Sampling
  const [sampleSize, setSampleSize] = useState(100);
  
  // Drop/Filter
  const [dropColName, setDropColName] = useState('');
  const [filterColName, setFilterColName] = useState('');
  const [filterMode, setFilterMode] = useState<'equals' | 'not_equals' | 'contains' | 'is_empty'>('equals');
  const [filterValue, setFilterValue] = useState('');

  // Transform AI
  const [transformDsId, setTransformDsId] = useState('');
  const [suggestions, setSuggestions] = useState<TransformationSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Merge/Integration
  const [integrationMode, setIntegrationMode] = useState<'merge' | 'lookup'>('merge');
  
  // Merge
  const [mergeStrategy, setMergeStrategy] = useState<'join' | 'union'>('join');
  const [mergeDsA, setMergeDsA] = useState(''); 
  const [mergeDsB, setMergeDsB] = useState(''); 
  const [selectedUnionIds, setSelectedUnionIds] = useState<Set<string>>(new Set()); 
  const [isMergingAI, setIsMergingAI] = useState(false);
  const [mergeKeys, setMergeKeys] = useState({ keyA: '', keyB: '' });
  const [mergeReason, setMergeReason] = useState('');
  const [newColName, setNewColName] = useState('');
  const [unionMappings, setUnionMappings] = useState<Record<string, string>>({});
  const [mergedDatasetName, setMergedDatasetName] = useState('');

  // Lookup (Enrichment)
  const [enrichTargetId, setEnrichTargetId] = useState('');
  const [enrichSourceId, setEnrichSourceId] = useState('');
  const [enrichJoinKey, setEnrichJoinKey] = useState('');
  const [enrichSelectedCols, setEnrichSelectedCols] = useState<Set<string>>(new Set());

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
                setDatasets(prev => {
                    const updated = [...prev];
                    valid.forEach((d, idx) => {
                        d.color = COLORS[(prev.length + idx) % COLORS.length];
                        updated.push(d);
                    });
                    return updated;
                });
                // Initial Advisor Prompt
                addChatMessage('ai', `I see you loaded ${valid.length} file(s). Ask me to find correlations or build models.`);
                setShowChat(true); // Open chat on first load to indicate help is available
            } else { alert("Could not parse files."); }
        } catch (error) { alert("Error uploading files"); } finally { setLoadingFile(false); e.target.value = ''; }
    }
  };

  const removeDataset = (id: string) => setDatasets(prev => prev.filter(d => d.id !== id));

  const getNumericColumns = (datasetId: string) => {
      const ds = datasets.find(d => d.id === datasetId);
      if (!ds || ds.data.length === 0) return [];
      const keys = Object.keys(ds.data[0]);
      // Improved: Scan first 50 rows to find numeric types, avoiding nulls/empty strings in the first row
      return keys.filter(k => {
          const sample = ds.data.slice(0, 50).find(row => row[k] !== null && row[k] !== undefined && row[k] !== '');
          return sample && typeof sample[k] === 'number';
      });
  };

  const getDateColumns = (datasetId: string) => {
      const ds = datasets.find(d => d.id === datasetId);
      if (!ds || ds.data.length === 0) return [];
      const keys = Object.keys(ds.data[0]);
      // Improved: Scan first 50 rows
      return keys.filter(k => {
          const sample = ds.data.slice(0, 50).find(row => row[k] !== null && row[k] !== undefined && row[k] !== '');
          const val = sample ? sample[k] : null;
          if (!val) return false;
          return k.toLowerCase().includes('date') || (typeof val === 'string' && !isNaN(Date.parse(val)) && val.length > 5 && /\d/.test(val));
      });
  };

  const handleAnalyzeSolo = (ds: Dataset) => {
      if (ds.data.length === 0) {
          alert("Cannot analyze empty dataset.");
          return;
      }
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
      
      // Determine context result based on active tab
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
              // Small delay to ensure state updates
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
      setIsSuggesting(true);
      const ds = datasets[0]; // Simple default to first
      const numeric = getNumericColumns(ds.id);
      const summary = generateDatasetSummary(ds.data).substring(0, 500);
      
      const suggestion = await suggestClusteringSetup(summary, numeric);
      setClusterDsId(ds.id);
      setClusterX(suggestion.x);
      setClusterY(suggestion.y);
      setKValue(suggestion.k);
      addChatMessage('ai', `I suggest clustering '${suggestion.x}' vs '${suggestion.y}' with K=${suggestion.k}. Reason: ${suggestion.reasoning}`);
      setIsSuggesting(false);
  };

  const handleAiSuggestForecast = async () => {
      if (datasets.length === 0) return;
      setIsSuggesting(true);
      const ds = datasets[0];
      const numeric = getNumericColumns(ds.id);
      const dates = getDateColumns(ds.id);
      const summary = generateDatasetSummary(ds.data).substring(0, 500);

      const suggestion = await suggestForecastingSetup(summary, dates, numeric);
      setForecastDsId(ds.id);
      setForecastDateCol(suggestion.dateCol);
      setForecastValueCol(suggestion.valueCol);
      addChatMessage('ai', `I suggest forecasting '${suggestion.valueCol}' over '${suggestion.dateCol}'. Reason: ${suggestion.reasoning}`);
      setIsSuggesting(false);
  };

  // --- STUDIO: SHAPING & SAMPLING HANDLERS ---
  const handleDropColumn = () => {
      if(!shapingDsId || !dropColName) return;
      setDatasets(prev => prev.map(ds => {
          if (ds.id === shapingDsId) {
              const newData = dropColumn(ds.data, dropColName);
              return { ...ds, data: newData };
          }
          return ds;
      }));
      setDropColName('');
  };

  const handleFilterRows = () => {
      if(!shapingDsId || !filterColName) return;
      setDatasets(prev => prev.map(ds => {
          if (ds.id === shapingDsId) {
              const newData = filterDataset(ds.data, filterColName, filterValue, filterMode);
              return { ...ds, data: newData };
          }
          return ds;
      }));
      setFilterColName('');
      setFilterValue('');
  };

  const handleCreateSample = () => {
      if(!shapingDsId || sampleSize <= 0) return;
      const ds = datasets.find(d => d.id === shapingDsId);
      if(!ds) return;
      
      const sampleData = createSample(ds.data, sampleSize, 'random');
      const newDs: Dataset = {
          id: Math.random().toString(36).substr(2, 9),
          name: `${ds.name}_sample_${sampleSize}`,
          data: sampleData,
          color: COLORS[datasets.length % COLORS.length]
      };
      setDatasets(prev => [...prev, newDs]);
      alert(`Created sample dataset with ${sampleData.length} rows.`);
  };

  // --- STUDIO: TRANSFORM HANDLERS ---
  const handleGetTransformSuggestions = async () => {
      const ds = datasets.find(d => d.id === transformDsId);
      if (!ds) return;
      setIsSuggesting(true);
      const summary = generateDatasetSummary(ds.data).substring(0, 1000);
      const cols = Object.keys(ds.data[0]);
      const suggs = await suggestTransformations(summary, cols);
      setSuggestions(suggs);
      setIsSuggesting(false);
  };

  const handleApplyTransformation = (s: TransformationSuggestion) => {
      setDatasets(prev => prev.map(ds => {
          if (ds.id === transformDsId) {
              const newData = applyTransformation(ds.data, s);
              return { ...ds, data: newData };
          }
          return ds;
      }));
      setSuggestions(prev => prev.filter(p => p.id !== s.id)); 
  };

  // --- STUDIO: MERGE & LOOKUP HANDLERS ---
  const toggleUnionSelection = (id: string) => {
      const next = new Set(selectedUnionIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedUnionIds(next);
  };

  const handleSuggestMerge = async () => {
      let targetFiles: Dataset[] = [];
      if (mergeStrategy === 'join') {
          if (mergeDsA && mergeDsB) targetFiles = datasets.filter(d => d.id === mergeDsA || d.id === mergeDsB);
          else targetFiles = datasets.slice(0, 2);
      } else {
          if (selectedUnionIds.size > 0) targetFiles = datasets.filter(d => selectedUnionIds.has(d.id));
          else targetFiles = datasets; 
      }
      if (targetFiles.length < 2) return;
      setIsMergingAI(true);
      const fileSchemas = targetFiles.map(d => ({ fileName: d.name, schema: Object.keys(d.data[0]).join(', ') }));
      const result = await suggestMergeStrategy(fileSchemas);
      setMergeReason(result.reasoning);
      setMergeStrategy(result.strategy);
      if (result.strategy === 'join') {
          setMergeKeys({ keyA: result.suggestedKeyA || '', keyB: result.suggestedKeyB || '' });
          if (!mergeDsA) setMergeDsA(targetFiles[0].id);
          if (!mergeDsB) setMergeDsB(targetFiles[1].id);
      } else {
          setNewColName(result.newColumnName || 'Source');
          const newMappings: Record<string, string> = {};
          result.fileMappings?.forEach(m => {
             const ds = targetFiles.find(d => d.name === m.fileName);
             if (ds) newMappings[ds.id] = m.suggestedValue;
          });
          setUnionMappings(newMappings);
          if (selectedUnionIds.size === 0) {
              const newIds = new Set<string>();
              targetFiles.forEach(t => newIds.add(t.id));
              setSelectedUnionIds(newIds);
          }
      }
      setIsMergingAI(false);
  };

  const handleExecuteMerge = () => {
      const finalName = mergedDatasetName.trim();
      if (mergeStrategy === 'join') {
        const dsA = datasets.find(d => d.id === mergeDsA);
        const dsB = datasets.find(d => d.id === mergeDsB);
        if (!dsA || !dsB || !mergeKeys.keyA || !mergeKeys.keyB) return;
        const { joinedData, matchedCount } = joinDatasets(dsA, dsB, mergeKeys.keyA, mergeKeys.keyB);
        
        if (matchedCount === 0) {
            alert("Join resulted in 0 records. Please check your join keys.");
            return;
        }

        const newDs: Dataset = {
            id: Math.random().toString(36).substr(2, 9),
            name: finalName || `Joined_${dsA.name.slice(0,5)}_${dsB.name.slice(0,5)}`,
            data: joinedData,
            color: COLORS[datasets.length % COLORS.length]
        };
        setDatasets(prev => [...prev, newDs]);
        setMergedDatasetName(''); 
        alert(`Successfully joined ${matchedCount} records.`);
      } else {
        const targetDatasets = datasets.filter(d => selectedUnionIds.has(d.id));
        if (targetDatasets.length < 2) return;
        const { joinedData, matchedCount } = unionDatasets(targetDatasets, newColName || 'Source', unionMappings);
        
        if (matchedCount === 0) {
            alert("Union resulted in 0 records.");
            return;
        }

        const newDs: Dataset = {
            id: Math.random().toString(36).substr(2, 9),
            name: finalName || `Stacked_Union_${matchedCount}_rows`,
            data: joinedData,
            color: COLORS[datasets.length % COLORS.length]
        };
        setDatasets(prev => [...prev, newDs]);
        setMergedDatasetName(''); 
        alert(`Successfully stacked ${targetDatasets.length} files (${matchedCount} rows).`);
      }
  };

  const handleExecuteLookup = () => {
    const dsTarget = datasets.find(d => d.id === enrichTargetId);
    const dsSource = datasets.find(d => d.id === enrichSourceId);
    if (!dsTarget || !dsSource || !enrichJoinKey || enrichSelectedCols.size === 0) return;

    // Build Lookup Map
    const sourceMap = new Map<string, any>();
    dsSource.data.forEach(row => {
        const key = String(row[enrichJoinKey]).trim();
        if (key) sourceMap.set(key, row);
    });

    let matchCount = 0;
    const enrichedData = dsTarget.data.map(row => {
        const key = String(row[enrichJoinKey]).trim();
        const sourceRow = sourceMap.get(key);
        const newRow = { ...row };
        if (sourceRow) {
            matchCount++;
            enrichSelectedCols.forEach(col => {
                newRow[col] = sourceRow[col];
            });
        } else {
             enrichSelectedCols.forEach(col => {
                newRow[col] = null; // or undefined
            });
        }
        return newRow;
    });

    const newDs: Dataset = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${dsTarget.name}_enriched`,
        data: enrichedData,
        color: COLORS[datasets.length % COLORS.length]
    };
    setDatasets(prev => [...prev, newDs]);
    alert(`Enriched ${dsTarget.name} with ${enrichSelectedCols.size} columns. Matched ${matchCount} rows.`);
  };

  const toggleEnrichCol = (col: string) => {
    const next = new Set(enrichSelectedCols);
    if (next.has(col)) next.delete(col); else next.add(col);
    setEnrichSelectedCols(next);
  };

  const getCleanFeatureName = (key: string) => {
      if (key.includes('_')) {
          const [dsId, col] = key.split('_');
          const ds = datasets.find(d => d.id === dsId);
          return ds ? `${col} (${ds.name})` : key;
      }
      return key;
  };

  // --- REPORTING HELPERS ---
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
                        {onAnalyzeDataset && (
                            <button onClick={() => handleAnalyzeSolo(ds)} className="w-full py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                                <PlayCircle size={14} /> Analyze Solo
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW: STATISTICAL WORKBENCH --- */}
        {activeTab === 'analysis' && datasets.length > 0 && (
            <div className="flex gap-6 h-full min-h-[600px] relative">
                
                {/* LEFT: Tool Selection & Config - Fixed Width */}
                <div className="w-80 flex-shrink-0 space-y-6 flex flex-col">
                    {/* Tool Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setAnalyticsMode('regression')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'regression' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200 hover:border-purple-200 bg-white'}`}
                        >
                            <Sigma className={`mb-2 ${analyticsMode === 'regression' ? 'text-purple-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Predictive</div>
                            <div className="text-[10px] text-slate-500">Regression</div>
                        </button>
                        
                        <button 
                            onClick={() => setAnalyticsMode('clustering')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'clustering' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200 bg-white'}`}
                        >
                            <ScatterIcon className={`mb-2 ${analyticsMode === 'clustering' ? 'text-emerald-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Clustering</div>
                            <div className="text-[10px] text-slate-500">K-Means</div>
                        </button>

                        <button 
                            onClick={() => setAnalyticsMode('correlation')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'correlation' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
                        >
                            <Grid3X3 className={`mb-2 ${analyticsMode === 'correlation' ? 'text-blue-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Correlation</div>
                            <div className="text-[10px] text-slate-500">Heatmap</div>
                        </button>

                        <button 
                            onClick={() => setAnalyticsMode('forecast')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${analyticsMode === 'forecast' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-200 bg-white'}`}
                        >
                            <TrendingUp className={`mb-2 ${analyticsMode === 'forecast' ? 'text-amber-600' : 'text-slate-400'}`} size={24}/>
                            <div className="font-bold text-slate-800 text-sm">Forecasting</div>
                            <div className="text-[10px] text-slate-500">Time-Series</div>
                        </button>
                    </div>

                    {/* Configuration Panel */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2 flex-1">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-slate-400" />
                                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                                    {analyticsMode} Config
                                </h3>
                            </div>
                            {(analyticsMode === 'clustering' || analyticsMode === 'forecast') && (
                                <button 
                                    onClick={analyticsMode === 'clustering' ? handleAiSuggestClustering : handleAiSuggestForecast}
                                    className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                >
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
                                <button onClick={handleRunForecast} className="w-full py-2 bg-amber-600 text-white rounded font-bold text-xs hover:bg-amber-700">Calculate Trend</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Visualization & Results - Flexible Width */}
                <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-w-0">
                    
                    {/* Placeholder State */}
                    {!trainedModel && !clusterResult && !corrMatrix && !forecastResult && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Calculator size={32} className="opacity-20"/>
                            </div>
                            <p className="font-medium">Select a tool and configure data to begin.</p>
                        </div>
                    )}

                    {/* REGRESSION RESULTS */}
                    {analyticsMode === 'regression' && trainedModel && (
                        <div className="flex flex-col h-full animate-in fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                                        Regression Model
                                        <AIInfoIcon type="regression" context={trainedModel} />
                                    </h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold">R²: {trainedModel.rSquared.toFixed(3)}</span>
                                        <span className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded">MAE: {trainedModel.mae.toFixed(2)}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => addToReport('Regression Model', trainedModel.predictionData, { type: 'scatter', title: 'Regression Fit', xAxisKey: 'actual', dataKey: 'predicted' })}
                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="actual" name="Actual" label={{ value: 'Actual', position: 'bottom' }} />
                                        <YAxis type="number" dataKey="predicted" name="Predicted" label={{ value: 'Predicted', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Model" data={trainedModel.predictionData} fill="#8b5cf6" />
                                        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: Math.max(...trainedModel.predictionData.map(d => d.actual)), y: Math.max(...trainedModel.predictionData.map(d => d.actual)) }]} stroke="#cbd5e1" strokeDasharray="3 3" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* ENHANCED PREDICTION SIMULATOR */}
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase">
                                    <Calculator size={14} /> AI Simulation Module
                                </div>
                                <div className="flex flex-wrap items-end gap-3">
                                    {trainedModel.featureColumns.map(f => (
                                        <div key={f} className="flex-1 min-w-[120px]">
                                            <label className="block text-[10px] text-slate-400 font-semibold mb-1 truncate" title={f}>{getCleanFeatureName(f)}</label>
                                            <input 
                                                placeholder="0.00" 
                                                className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none" 
                                                onChange={(e) => setPredictionInputs({...predictionInputs, [f]: e.target.value})}
                                            />
                                        </div>
                                    ))}
                                    <button 
                                        onClick={handlePredict} 
                                        className="h-10 px-6 bg-purple-600 text-white rounded-lg font-bold text-sm hover:bg-purple-700 shadow-sm transition-all active:scale-95"
                                    >
                                        Predict Y-Hat
                                    </button>
                                </div>
                                
                                {predictedValue !== null && (
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center animate-in fade-in">
                                        <span className="text-sm font-medium text-slate-600">Predicted Result (Y-Hat):</span>
                                        <span className="text-2xl font-bold text-purple-700 bg-purple-100 px-4 py-1 rounded-lg">
                                            {predictedValue.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CLUSTERING RESULTS */}
                    {analyticsMode === 'clustering' && clusterResult && (
                        <div className="flex flex-col h-full animate-in fade-in">
                            <div className="flex justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                        K-Means Clustering (K={clusterResult.k})
                                        <AIInfoIcon type="clustering" context={clusterResult} />
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => addToReport(`K-Means Clusters (K=${clusterResult.k})`, clusterResult.clusters.flatMap(c => c.points), { type: 'scatter', title: 'Cluster Distribution', xAxisKey: 'x', dataKey: 'y' })}
                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="x" name={clusterResult.xAxis} label={{ value: clusterResult.xAxis, position: 'bottom' }} />
                                        <YAxis type="number" dataKey="y" name={clusterResult.yAxis} label={{ value: clusterResult.yAxis, angle: -90, position: 'insideLeft' }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        {clusterResult.clusters.map((c, i) => (
                                            <Scatter key={i} name={`Cluster ${i+1}`} data={c.points} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* CORRELATION MATRIX RESULTS */}
                    {analyticsMode === 'correlation' && corrMatrix && (
                        <div className="h-full overflow-auto animate-in fade-in flex flex-col">
                            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    Correlation Heatmap
                                    <AIInfoIcon type="correlation" context={corrMatrix} />
                                </h3>
                                <button 
                                    onClick={() => addToReport('Correlation Matrix', corrMatrix.matrix, { type: 'table', title: 'Feature Correlation' })}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${corrMatrix.columns.length}, 1fr)` }}>
                                    <div className="h-24"></div>
                                    {corrMatrix.columns.map(col => (
                                        <div key={col} className="h-24 flex items-end justify-center pb-2">
                                            <span className="text-xs font-bold text-slate-500 -rotate-45 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] origin-bottom-left transform translate-x-4">{col}</span>
                                        </div>
                                    ))}
                                    
                                    {corrMatrix.matrix.map((row, i) => (
                                        <React.Fragment key={i}>
                                            <div className="flex items-center justify-end pr-2 h-12">
                                                <span className="text-xs font-bold text-slate-500 truncate max-w-[100px]" title={corrMatrix.columns[i]}>{corrMatrix.columns[i]}</span>
                                            </div>
                                            {row.map((val, j) => (
                                                <div 
                                                    key={`${i}-${j}`} 
                                                    className="h-12 border border-white flex items-center justify-center text-[10px] font-mono text-white relative group"
                                                    style={{ backgroundColor: val > 0 ? `rgba(59, 130, 246, ${val})` : `rgba(239, 68, 68, ${Math.abs(val)})` }}
                                                >
                                                    {val.toFixed(2)}
                                                    <div className="absolute inset-0 bg-black/80 hidden group-hover:flex items-center justify-center z-10 p-1 text-center rounded">
                                                        {corrMatrix.columns[i]} vs {corrMatrix.columns[j]}: {val.toFixed(3)}
                                                    </div>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FORECAST RESULTS */}
                    {analyticsMode === 'forecast' && forecastResult && (
                        <div className="flex flex-col h-full animate-in fade-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                                        Trend Forecast
                                        <AIInfoIcon type="forecast" context={forecastResult} />
                                    </h3>
                                    <p className="text-xs text-slate-500">Linear projection with 95% confidence intervals</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-slate-800">{(forecastResult.growthRate * 100).toFixed(1)}%</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wide">Proj. Growth</div>
                                    </div>
                                    <button 
                                        onClick={() => addToReport('Trend Forecast', forecastResult.forecast, { type: 'line', title: 'Growth Projection', dataKey: 'value', xAxisKey: 'date' })}
                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tick={{fontSize: 10}} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line name="Historical" data={forecastResult.historical} type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} />
                                        <Line name="Forecast" data={forecastResult.forecast} type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                                        <Line name="Lower Bound" data={forecastResult.forecast} type="monotone" dataKey="lowerBound" stroke="#fcd34d" strokeWidth={0} dot={false} activeDot={false} />
                                        <Line name="Upper Bound" data={forecastResult.forecast} type="monotone" dataKey="upperBound" stroke="#fcd34d" strokeWidth={0} dot={false} activeDot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                </div>

                {/* Floating Chat Interface */}
                <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
                    {showChat && (
                        <div className="w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200 ring-1 ring-slate-900/5">
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center shadow-sm shrink-0">
                                <h3 className="font-bold flex items-center gap-2 text-sm tracking-wide">
                                    <Bot className="text-indigo-100" size={18} /> Model Advisor
                                </h3>
                                <button onClick={() => setShowChat(false)} className="text-indigo-200 hover:text-white transition-colors bg-white/10 p-1 rounded-full hover:bg-white/20">
                                    <X size={14} />
                                </button>
                            </div>
                            
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar scroll-smooth">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                                        }`}>
                                            {msg.text}
                                            <div className={`text-[10px] mt-1.5 font-medium ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isAdvisorThinking && (
                                    <div className="flex justify-start animate-pulse">
                                        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-2 items-center text-slate-500 text-xs font-medium">
                                            <Loader2 className="animate-spin text-indigo-500" size={14} /> 
                                            Analyzing context...
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                                <div className="relative flex items-center gap-2">
                                    <input 
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Ask about your data..."
                                        className="flex-1 pl-4 pr-10 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isAdvisorThinking}
                                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                                <div className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                                    AI can configure models & run analysis
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Toggle Button */}
                    {!showChat && (
                        <button 
                            onClick={() => setShowChat(true)}
                            className="group flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 ring-4 ring-white"
                            title="Open AI Advisor"
                        >
                            <Bot size={28} className="group-hover:rotate-12 transition-transform" />
                            <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                AI Advisor
                            </span>
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* --- VIEW: DATA STUDIO --- */}
        {activeTab === 'studio' && datasets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                
                {/* Panel 1: Structure & Cleaning */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                        <Scissors className="text-pink-500" />
                        <h3 className="font-bold text-slate-800">Shaping & Cleaning</h3>
                    </div>

                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Target Dataset</label>
                    <select 
                        value={shapingDsId}
                        onChange={(e) => setShapingDsId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 mb-4"
                    >
                        <option value="">Select Dataset...</option>
                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>

                    <div className="space-y-6">
                        {/* Drop Column */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Drop Column</h4>
                            <div className="flex gap-2">
                                <select 
                                    value={dropColName}
                                    onChange={(e) => setDropColName(e.target.value)}
                                    className="flex-1 p-2 border border-slate-200 rounded text-xs"
                                    disabled={!shapingDsId}
                                >
                                    <option value="">Select Column...</option>
                                    {shapingDsId && Object.keys(datasets.find(d => d.id === shapingDsId)?.data[0] || {}).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleDropColumn}
                                    disabled={!shapingDsId || !dropColName}
                                    className="px-3 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Filter Rows */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Filter Rows</h4>
                            <div className="space-y-2">
                                <select 
                                    value={filterColName}
                                    onChange={(e) => setFilterColName(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded text-xs"
                                    disabled={!shapingDsId}
                                >
                                    <option value="">Select Column...</option>
                                    {shapingDsId && Object.keys(datasets.find(d => d.id === shapingDsId)?.data[0] || {}).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select 
                                        value={filterMode}
                                        onChange={(e) => setFilterMode(e.target.value as any)}
                                        className="w-1/3 p-2 border border-slate-200 rounded text-xs"
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="not_equals">Not Equals</option>
                                        <option value="contains">Contains</option>
                                        <option value="is_empty">Is Empty</option>
                                    </select>
                                    <input 
                                        placeholder="Value..." 
                                        value={filterValue}
                                        onChange={(e) => setFilterValue(e.target.value)}
                                        className="flex-1 p-2 border border-slate-200 rounded text-xs"
                                        disabled={filterMode === 'is_empty'}
                                    />
                                </div>
                                <button 
                                    onClick={handleFilterRows}
                                    disabled={!shapingDsId || !filterColName}
                                    className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-100"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </div>

                         {/* Sampling */}
                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Create Sample</h4>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="number"
                                    min="10"
                                    value={sampleSize}
                                    onChange={(e) => setSampleSize(Number(e.target.value))}
                                    className="w-20 p-2 border border-slate-200 rounded text-xs"
                                />
                                <span className="text-xs text-slate-400">rows</span>
                                <button 
                                    onClick={handleCreateSample}
                                    disabled={!shapingDsId}
                                    className="flex-1 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-semibold hover:bg-indigo-100"
                                >
                                    Generate Sample
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel 2: Transformation */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                        <ArrowDownUp className="text-purple-500" />
                        <h3 className="font-bold text-slate-800">AI Transforms</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase">Target Dataset</label>
                        <select 
                            value={transformDsId}
                            onChange={(e) => setTransformDsId(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                        >
                            <option value="">Select Dataset...</option>
                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        <button 
                            onClick={handleGetTransformSuggestions}
                            disabled={!transformDsId || isSuggesting}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                            {isSuggesting ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16} />}
                            Ask AI for Suggestions
                        </button>

                        <div className="space-y-3 mt-4 h-96 overflow-y-auto pr-1 custom-scrollbar">
                            {suggestions.map((s) => (
                                <div key={s.id} className="p-3 border border-purple-100 bg-purple-50 rounded-lg flex justify-between items-start gap-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-purple-800">{s.title}</h4>
                                        <p className="text-xs text-purple-600">{s.description}</p>
                                        <div className="mt-2 text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded inline-block">
                                            {s.action} on '{s.targetColumn}'
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleApplyTransformation(s)}
                                        className="text-purple-600 hover:text-purple-800 bg-white p-1.5 rounded-lg border border-purple-200"
                                        title="Apply"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {suggestions.length === 0 && transformDsId && !isSuggesting && (
                                <div className="text-center text-xs text-slate-400 py-4">No suggestions generated yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel 3: Integration (Merge & Enrich) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                        <Combine className="text-blue-500" />
                        <h3 className="font-bold text-slate-800">Integration</h3>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
                        <button 
                           onClick={() => setIntegrationMode('merge')}
                           className={`flex-1 py-1 text-sm font-medium rounded transition-all ${integrationMode === 'merge' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Merge Files
                        </button>
                        <button 
                           onClick={() => setIntegrationMode('lookup')}
                           className={`flex-1 py-1 text-sm font-medium rounded transition-all ${integrationMode === 'lookup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Lookup Columns
                        </button>
                    </div>

                    {integrationMode === 'merge' ? (
                        <>
                             <div className="flex gap-2 mb-4">
                                <button 
                                   onClick={() => setMergeStrategy('join')}
                                   className={`flex-1 py-1 text-xs border rounded transition-all ${mergeStrategy === 'join' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                >
                                    Join (Side-by-Side)
                                </button>
                                <button 
                                   onClick={() => setMergeStrategy('union')}
                                   className={`flex-1 py-1 text-xs border rounded transition-all ${mergeStrategy === 'union' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-slate-200 text-slate-500'}`}
                                >
                                    Stack (Vertical)
                                </button>
                            </div>

                            <button 
                                onClick={handleSuggestMerge}
                                disabled={isMergingAI}
                                className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium flex items-center justify-center gap-2 disabled:opacity-50 mb-4 text-xs"
                            >
                                {isMergingAI ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                AI Strategy
                            </button>
                            
                            {mergeReason && (
                                <div className="p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100 mb-4">
                                    <strong>AI:</strong> {mergeReason}
                                </div>
                            )}

                            <div className="space-y-4">
                                {mergeStrategy === 'join' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Left Dataset</label>
                                                <select 
                                                    value={mergeDsA}
                                                    onChange={(e) => setMergeDsA(e.target.value)}
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs mt-1"
                                                >
                                                    <option value="">Select...</option>
                                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Right Dataset</label>
                                                <select 
                                                    value={mergeDsB}
                                                    onChange={(e) => setMergeDsB(e.target.value)}
                                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs mt-1"
                                                >
                                                    <option value="">Select...</option>
                                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input 
                                                placeholder="Key Col A"
                                                value={mergeKeys.keyA}
                                                onChange={(e) => setMergeKeys({...mergeKeys, keyA: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                                            />
                                            <input 
                                                placeholder="Key Col B"
                                                value={mergeKeys.keyB}
                                                onChange={(e) => setMergeKeys({...mergeKeys, keyB: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                            {datasets.map(ds => (
                                                <div key={ds.id} className="flex items-center gap-2 mb-1">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedUnionIds.has(ds.id)}
                                                        onChange={() => toggleUnionSelection(ds.id)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs truncate">{ds.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <input 
                                            placeholder="New Source Column Name"
                                            value={newColName}
                                            onChange={(e) => setNewColName(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                                        />
                                    </div>
                                )}
                                
                                <input 
                                    placeholder="Resulting Dataset Name"
                                    value={mergedDatasetName}
                                    onChange={(e) => setMergedDatasetName(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                                />

                                <button 
                                    onClick={handleExecuteMerge}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs"
                                >
                                    Execute {mergeStrategy === 'join' ? 'Join' : 'Stack'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Dataset (To Enrich)</label>
                                <select 
                                    value={enrichTargetId}
                                    onChange={(e) => setEnrichTargetId(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs mt-1"
                                >
                                    <option value="">Select...</option>
                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Source Dataset (From)</label>
                                <select 
                                    value={enrichSourceId}
                                    onChange={(e) => setEnrichSourceId(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs mt-1"
                                >
                                    <option value="">Select...</option>
                                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Common ID / Join Key</label>
                                <input 
                                    placeholder="e.g. PatientID, SKU"
                                    value={enrichJoinKey}
                                    onChange={(e) => setEnrichJoinKey(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-xs mt-1"
                                />
                            </div>

                            {enrichSourceId && (
                                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                    <div className="text-[10px] text-slate-500 font-bold mb-1">Select Columns to Add:</div>
                                    {Object.keys(datasets.find(d => d.id === enrichSourceId)?.data[0] || {}).map(col => (
                                        <div key={col} className="flex items-center gap-2 mb-1">
                                            <input 
                                                type="checkbox"
                                                checked={enrichSelectedCols.has(col)}
                                                onChange={() => toggleEnrichCol(col)}
                                                className="rounded text-blue-600"
                                            />
                                            <span className="text-xs truncate">{col}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button 
                                onClick={handleExecuteLookup}
                                disabled={!enrichTargetId || !enrichSourceId || !enrichJoinKey || enrichSelectedCols.size === 0}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs disabled:opacity-50"
                            >
                                Add Columns
                            </button>
                        </div>
                    )}
                </div>

            </div>
        )}
    </div>
  );
};

export default MultiFileAnalysis;
