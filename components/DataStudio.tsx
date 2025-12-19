
import React, { useState, useMemo, useEffect } from 'react';
import { Dataset, PatientRecord, TransformationSuggestion, DataQualityReport, ColumnStatistics } from '../types';
import {
    generateDatasetSummary, dropColumn, removeRowsWithMissing, filterDataset,
    joinDatasets, unionDatasets, applyTransformation, renameColumnInDataset, imputeMissingValues, createSample, generateQualityReport,
    generateColumnStatistics, detectDuplicates, removeDuplicates, detectOutliers, removeOutliers,
    calculateTTest, calculateChiSquare, standardizeDates
} from '../services/dataService';
import { suggestTransformations, suggestMergeStrategy, interpretCustomTransformation } from '../services/geminiService';
import {
    Scissors, Wand2, Combine, Trash2, ArrowDownUp, Filter, Loader2, Sparkles,
    CheckCircle2, AlertTriangle, Table2, FileText, Download, Save, X, Plus, Copy, AlertOctagon, BarChart3, Hash, Search, ArrowRightCircle, Bot, Info, ChevronDown, Calculator, Layers, Lightbulb
} from 'lucide-react';

interface DataStudioProps {
    datasets: Dataset[];
    activeDatasetId: string | null;
    onUpdateDatasets: (datasets: Dataset[]) => void;
    onAnalyzeDataset: (id: string) => void;
}

const DataStudio: React.FC<DataStudioProps> = ({ datasets, activeDatasetId, onUpdateDatasets, onAnalyzeDataset }) => {
    const [activeTab, setActiveTab] = useState<'clean' | 'transform' | 'merge' | 'hypothesis'>('clean');

    // State for Cleaning
    const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
    const [editingCol, setEditingCol] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");
    const [stats, setStats] = useState<ColumnStatistics[]>([]);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [duplicateSample, setDuplicateSample] = useState<string[]>([]);

    // Outlier State
    const [selectedOutlierCol, setSelectedOutlierCol] = useState("");
    const [outlierCount, setOutlierCount] = useState<number | null>(null);
    const [outlierValues, setOutlierValues] = useState<number[]>([]);
    const [outlierStats, setOutlierStats] = useState<{ mean: number, median: number, mode: number } | null>(null);
    const [outlierFixStrategy, setOutlierFixStrategy] = useState<'remove' | 'mean' | 'median' | 'mode' | 'custom'>('remove');
    const [customOutlierValue, setCustomOutlierValue] = useState("");

    // Fix Modal State (The "Wand" feature)
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [activeFixCol, setActiveFixCol] = useState<{ name: string, type: string, missingPct: number } | null>(null);
    const [columnFixStrategy, setColumnFixStrategy] = useState<'recommendation' | 'custom' | 'remove'>('recommendation');
    const [columnFixCustomVal, setColumnFixCustomVal] = useState("");

    // State for Transform
    const [suggestions, setSuggestions] = useState<TransformationSuggestion[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [customTransformInput, setCustomTransformInput] = useState("");
    const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

    // State for Merge
    const [mergeStrategy, setMergeStrategy] = useState<'join' | 'union' | 'lookup'>('join');
    const [mergeDsA, setMergeDsA] = useState('');
    const [mergeDsB, setMergeDsB] = useState('');
    const [mergeKeys, setMergeKeys] = useState({ keyA: '', keyB: '' });
    const [mergedName, setMergedName] = useState('');
    const [isMergingAI, setIsMergingAI] = useState(false);
    const [mergeReason, setMergeReason] = useState('');

    // Union specific
    const [unionSelectedIds, setUnionSelectedIds] = useState<Set<string>>(new Set());
    const [unionNewColName, setUnionNewColName] = useState('');
    const [unionMappings, setUnionMappings] = useState<Record<string, string>>({});

    // Lookup specific
    const [enrichSelectedCols, setEnrichSelectedCols] = useState<Set<string>>(new Set());

    // Hypothesis Lab State
    const [hypoTestType, setHypoTestType] = useState<'ttest' | 'chisquare'>('ttest');
    const [hypoColA, setHypoColA] = useState("");
    const [hypoColB, setHypoColB] = useState("");
    const [hypoResult, setHypoResult] = useState<any>(null);

    const activeDataset = useMemo(() => datasets.find(d => d.id === activeDatasetId), [datasets, activeDatasetId]);

    // Generate Report & Stats on mount or change
    useEffect(() => {
        if (activeDataset) {
            const report = generateQualityReport(activeDataset.data);
            setQualityReport(report);
            setStats(generateColumnStatistics(activeDataset.data));

            // Detect duplicates and get a sample
            const dupCount = detectDuplicates(activeDataset.data);
            setDuplicateCount(dupCount);
            if (dupCount > 0) {
                const seen = new Set();
                const dups: string[] = [];
                for (const row of activeDataset.data) {
                    const sig = JSON.stringify(row);
                    if (seen.has(sig) && dups.length < 3) dups.push(sig);
                    seen.add(sig);
                }
                setDuplicateSample(dups);
            } else {
                setDuplicateSample([]);
            }

            // Reset Outlier UI
            setOutlierCount(null);
            setSelectedOutlierCol("");
            setOutlierStats(null);
            setOutlierValues([]);
        } else {
            setQualityReport(null);
            setStats([]);
        }
    }, [activeDataset]);

    // --- ACTIONS ---

    const handleUpdateActive = (newData: PatientRecord[]) => {
        if (!activeDatasetId) return;
        const updatedDatasets = datasets.map(d =>
            d.id === activeDatasetId ? { ...d, data: newData } : d
        );
        onUpdateDatasets(updatedDatasets);
    };

    const handleRenameColumn = (oldName: string) => {
        if (tempName && tempName !== oldName && activeDataset) {
            const newData = renameColumnInDataset(activeDataset.data, oldName, tempName);
            handleUpdateActive(newData);
        }
        setEditingCol(null);
    };

    // Generic Fix Handler (used by table buttons)
    const handleFixMissing = (colName: string, strategy: 'mean' | 'mode' | 'remove_rows') => {
        if (!activeDataset) return;
        let newData = [...activeDataset.data];
        if (strategy === 'remove_rows') {
            newData = removeRowsWithMissing(newData, colName);
        } else {
            newData = imputeMissingValues(newData, colName, strategy);
        }
        handleUpdateActive(newData);
    };

    const handleStandardizeDate = (colName: string) => {
        if (!activeDataset) return;
        const newData = standardizeDates(activeDataset.data, colName);
        handleUpdateActive(newData);
        alert(`Standardized dates in column '${colName}'.`);
    };

    const handleDropColumn = (colName: string) => {
        if (!activeDataset) return;
        if (!window.confirm(`Are you sure you want to drop column '${colName}'?`)) return;
        const newData = dropColumn(activeDataset.data, colName);
        handleUpdateActive(newData);
    };

    const handleRemoveDuplicates = () => {
        if (!activeDataset) return;
        const newData = removeDuplicates(activeDataset.data);
        handleUpdateActive(newData);
        alert(`Removed ${duplicateCount} duplicate rows.`);
    };

    const calculateDetailedStats = (col: string) => {
        if (!activeDataset) return;
        const values = activeDataset.data.map(d => Number(d[col])).filter(v => !isNaN(v) && v !== null);
        if (values.length === 0) return;

        values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

        const counts: Record<string, number> = {};
        let mode = values[0];
        let maxCount = 0;
        values.forEach(v => {
            const s = String(v);
            counts[s] = (counts[s] || 0) + 1;
            if (counts[s] > maxCount) {
                maxCount = counts[s];
                mode = v;
            }
        });

        setOutlierStats({ mean, median, mode });

        // Identify specific outliers for display
        const q1 = values[Math.floor((values.length / 4))];
        const q3 = values[Math.floor((values.length * (3 / 4)))];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        const actualOutliers = values.filter(v => v < lower || v > upper);
        setOutlierValues(actualOutliers.slice(0, 10)); // Top 10 for display
    };

    const handleCheckOutliers = () => {
        if (!activeDataset || !selectedOutlierCol) return;
        const count = detectOutliers(activeDataset.data, selectedOutlierCol);
        setOutlierCount(count);
        calculateDetailedStats(selectedOutlierCol);
    };

    const handleApplyOutlierFix = () => {
        if (!activeDataset || !selectedOutlierCol || !outlierStats) return;

        let newData = [...activeDataset.data];
        const values = newData.map(d => Number(d[selectedOutlierCol])).filter(v => !isNaN(v) && v !== null);
        values.sort((a, b) => a - b);
        const q1 = values[Math.floor((values.length / 4))];
        const q3 = values[Math.floor((values.length * (3 / 4)))];
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;

        if (outlierFixStrategy === 'remove') {
            newData = removeOutliers(newData, selectedOutlierCol);
        } else {
            let fillVal: number;
            if (outlierFixStrategy === 'mean') fillVal = outlierStats.mean;
            else if (outlierFixStrategy === 'median') fillVal = outlierStats.median;
            else if (outlierFixStrategy === 'mode') fillVal = outlierStats.mode;
            else fillVal = Number(customOutlierValue);

            newData = newData.map(row => {
                const v = Number(row[selectedOutlierCol]);
                if (typeof row[selectedOutlierCol] === 'number' && (v < lower || v > upper)) {
                    return { ...row, [selectedOutlierCol]: fillVal };
                }
                return row;
            });
        }

        handleUpdateActive(newData);
        setOutlierCount(null);
        setOutlierStats(null);
        setOutlierValues([]);
        alert(`Applied outlier fix: ${outlierFixStrategy}`);
    };

    // --- WAND FIX MODAL HANDLERS ---
    const handleOpenFixModal = (col: any) => {
        setActiveFixCol({
            name: col.name,
            type: col.type,
            missingPct: col.missingPercentage
        });
        setColumnFixStrategy('recommendation');
        setColumnFixCustomVal('');
        setFixModalOpen(true);
    };

    const handleApplyColumnFix = () => {
        if (!activeDataset || !activeFixCol) return;
        let newData = [...activeDataset.data];

        if (columnFixStrategy === 'remove') {
            newData = removeRowsWithMissing(newData, activeFixCol.name);
        } else if (columnFixStrategy === 'custom') {
            newData = imputeMissingValues(newData, activeFixCol.name, 'custom', columnFixCustomVal);
        } else if (columnFixStrategy === 'standardize') {
            newData = standardizeDates(newData, activeFixCol.name);
        } else {
            // Recommendation: Mean for numbers, Mode for others
            const strategy = activeFixCol.type === 'number' ? 'mean' : 'mode';
            newData = imputeMissingValues(newData, activeFixCol.name, strategy);
        }

        handleUpdateActive(newData);
        setFixModalOpen(false);
        setActiveFixCol(null);
    };

    // --- TRANSFORM ACTIONS ---

    const handleGetTransformSuggestions = async () => {
        if (!activeDataset) return;
        setIsSuggesting(true);
        const summary = generateDatasetSummary(activeDataset.data).substring(0, 1000);
        const cols = Object.keys(activeDataset.data[0] || {});
        const res = await suggestTransformations(summary, cols);
        setSuggestions(res);
        setIsSuggesting(false);
    };

    const handleApplyTransformation = (s: TransformationSuggestion) => {
        if (!activeDataset) return;
        const newData = applyTransformation(activeDataset.data, s);
        handleUpdateActive(newData);
        setSuggestions(prev => prev.filter(x => x.id !== s.id));
    };

    const handleCustomTransform = async () => {
        if (!activeDataset || !customTransformInput.trim()) return;
        setIsGeneratingCustom(true);
        const cols = Object.keys(activeDataset.data[0] || {});
        const suggestion = await interpretCustomTransformation(customTransformInput, cols);
        if (suggestion) {
            handleApplyTransformation(suggestion);
            setCustomTransformInput("");
            alert(`Applied custom transformation: ${suggestion.title}`);
        } else {
            alert("Could not interpret transformation request.");
        }
        setIsGeneratingCustom(false);
    };

    // --- MERGE ACTIONS ---

    const toggleUnionId = (id: string) => {
        const next = new Set(unionSelectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setUnionSelectedIds(next);
    };

    const handleUnionMappingChange = (id: string, value: string) => {
        setUnionMappings(prev => ({ ...prev, [id]: value }));
    };

    const handleSuggestMerge = async () => {
        let targetFiles: Dataset[] = [];
        // If Union mode, use selected files if any, else all
        if (mergeStrategy === 'union') {
            if (unionSelectedIds.size > 0) targetFiles = datasets.filter(d => unionSelectedIds.has(d.id));
            else targetFiles = datasets;
        } else {
            // Join mode
            if (mergeDsA && mergeDsB) targetFiles = datasets.filter(d => d.id === mergeDsA || d.id === mergeDsB);
            else targetFiles = datasets.slice(0, 2);
        }

        if (targetFiles.length < 2) {
            alert("Select at least 2 files for AI analysis.");
            return;
        }

        setIsMergingAI(true);
        const fileSchemas = targetFiles.map(d => ({ fileName: d.name, schema: Object.keys(d.data[0]).join(', ') }));
        const result = await suggestMergeStrategy(fileSchemas);

        setMergeStrategy(result.strategy as any);
        setMergeReason(result.reasoning);

        if (result.strategy === 'join') {
            if (!mergeDsA) setMergeDsA(targetFiles[0].id);
            if (!mergeDsB) setMergeDsB(targetFiles[1].id);
            setMergeKeys({ keyA: result.suggestedKeyA || '', keyB: result.suggestedKeyB || '' });
        } else if (result.strategy === 'union') {
            setUnionNewColName(result.newColumnName || 'Source');

            // Apply mappings
            const newMappings: Record<string, string> = {};
            result.fileMappings?.forEach(m => {
                const ds = targetFiles.find(d => d.name === m.fileName);
                if (ds) newMappings[ds.id] = m.suggestedValue;
            });
            setUnionMappings(newMappings);

            // Auto select relevant files for union
            const newIds = new Set<string>();
            targetFiles.forEach(t => newIds.add(t.id));
            setUnionSelectedIds(newIds);
        }

        setIsMergingAI(false);
    };

    const handleExecuteMerge = () => {
        const dsA = datasets.find(d => d.id === mergeDsA);
        const dsB = datasets.find(d => d.id === mergeDsB);

        let resultData: any[] = [];
        let count = 0;

        if (mergeStrategy === 'join') {
            if (!dsA || !dsB) return;
            if (!mergeKeys.keyA || !mergeKeys.keyB) return;
            const res = joinDatasets(dsA, dsB, mergeKeys.keyA, mergeKeys.keyB);
            resultData = res.joinedData;
            count = res.matchedCount;
        } else if (mergeStrategy === 'union') {
            const targetDatasets = datasets.filter(d => unionSelectedIds.has(d.id));
            if (targetDatasets.length < 2) {
                alert("Select at least 2 files to stack.");
                return;
            }
            const res = unionDatasets(targetDatasets, unionNewColName || 'Source', unionMappings);
            resultData = res.joinedData;
            count = res.matchedCount;
        } else if (mergeStrategy === 'lookup') {
            if (!dsA || !dsB) return;
            if (!mergeKeys.keyA || enrichSelectedCols.size === 0) return;

            const mapB = new Map<string, any>();
            dsB.data.forEach(row => {
                const k = String(row[mergeKeys.keyA]);
                if (k) mapB.set(k, row);
            });

            resultData = dsA.data.map(row => {
                const k = String(row[mergeKeys.keyA]);
                const match = mapB.get(k);
                const newRow = { ...row };
                enrichSelectedCols.forEach(col => {
                    newRow[col] = match ? match[col] : null;
                });
                return newRow;
            });
            count = resultData.length;
        }

        const newDs: Dataset = {
            id: Math.random().toString(36).substr(2, 9),
            name: mergedName || `${mergeStrategy === 'lookup' ? 'Enriched' : 'Merged'}_${mergeStrategy === 'join' ? dsA?.name : 'Files'}`,
            data: resultData
        };

        onUpdateDatasets([...datasets, newDs]);
        alert(`Operation successful. Created new dataset with ${count} rows.`);
        setMergedName('');
    };


    const handleRunHypothesisTest = () => {
        if (!activeDataset) return;

        if (hypoTestType === 'ttest') {
            if (!hypoColA || !hypoColB) return;
            const groupA = activeDataset.data.map(d => Number(d[hypoColA])).filter(v => !isNaN(v));
            const groupB = activeDataset.data.map(d => Number(d[hypoColB])).filter(v => !isNaN(v));
            const result = calculateTTest(groupA, groupB);
            setHypoResult(result);
        } else {
            // Chi-Square: We need a contingency table. For now, a simple one from two categorical cols.
            if (!hypoColA || !hypoColB) return;

            // Build contingency table
            const valA = Array.from(new Set(activeDataset.data.map(d => String(d[hypoColA]))));
            const valB = Array.from(new Set(activeDataset.data.map(d => String(d[hypoColB]))));

            const observed: number[][] = valA.map(() => valB.map(() => 0));

            activeDataset.data.forEach(row => {
                const i = valA.indexOf(String(row[hypoColA]));
                const j = valB.indexOf(String(row[hypoColB]));
                if (i >= 0 && j >= 0) observed[i][j]++;
            });

            const result = calculateChiSquare(observed);
            setHypoResult(result);
        }
    };

    const toggleEnrichCol = (col: string) => {
        const next = new Set(enrichSelectedCols);
        if (next.has(col)) next.delete(col); else next.add(col);
        setEnrichSelectedCols(next);
    };

    if (!activeDataset && datasets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Table2 size={48} className="mb-4 opacity-50" />
                <p>Upload a file to the Drive to begin.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Data Studio</h2>
                    <p className="text-slate-500">Prepare, clean, and shape your data before analysis.</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('clean')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'clean' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Scissors size={16} /> Cleaning & Polishing
                    </button>
                    <button
                        onClick={() => setActiveTab('transform')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'transform' ? 'bg-purple-50 text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowDownUp size={16} /> Transforms
                    </button>
                    <button
                        onClick={() => setActiveTab('merge')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'merge' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Combine size={16} /> Merge Files
                    </button>
                    <button
                        onClick={() => setActiveTab('hypothesis')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'hypothesis' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Calculator size={16} /> Hypothesis Lab
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto relative">
                {activeTab === 'clean' && qualityReport ? (
                    <div className="space-y-8 animate-in fade-in">

                        {/* AI Cleaning Advisor Panel */}
                        <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div>
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Sparkles size={16} /> AI Health Scan</h3>
                                <p className="text-sm text-indigo-700 mt-1">
                                    {qualityReport.issues.length > 0
                                        ? `Detected ${qualityReport.issues.length} potential issues affecting data integrity.`
                                        : "Your data looks healthy and ready for analysis."}
                                </p>
                            </div>
                            {qualityReport.issues.length > 0 && (
                                <div className="flex gap-2">
                                    <span className="text-xs bg-white text-indigo-600 px-3 py-1 rounded-full border border-indigo-200 font-medium">
                                        {qualityReport.issues[0]}
                                    </span>
                                    {qualityReport.issues.length > 1 && (
                                        <span className="text-xs bg-white text-indigo-600 px-3 py-1 rounded-full border border-indigo-200 font-medium">
                                            +{qualityReport.issues.length - 1} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Advanced Cleaning Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2"><Table2 size={14} /> Health Score</div>
                                <div className="text-4xl font-bold text-slate-800 mt-2">{qualityReport.score}/100</div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 relative group">
                                <div className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2"><Copy size={14} /> Duplicates</div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="text-4xl font-bold text-slate-800">{duplicateCount}</div>
                                    {duplicateCount > 0 && (
                                        <button onClick={handleRemoveDuplicates} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 font-medium">Remove All</button>
                                    )}
                                </div>

                                {/* Duplicate Hover Info */}
                                {duplicateCount > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto w-[300px]">
                                        <div className="text-xs font-bold text-slate-600 mb-2">Duplicate Data Detected</div>
                                        <div className="text-[10px] text-slate-500 mb-2">
                                            Found {duplicateCount} exact matching rows. Examples:
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-600 font-mono mb-2 overflow-x-hidden">
                                            {duplicateSample.slice(0, 2).map((s, i) => (
                                                <div key={i} className="mb-1 truncate border-b border-slate-200 pb-1">{s}</div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-red-500">Removing these will improve model accuracy.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                                <div className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2"><AlertOctagon size={14} /> Outlier Detection</div>
                                <div className="flex gap-2 mt-2">
                                    <select
                                        className="p-1.5 text-sm border rounded bg-white w-40 focus:ring-2 focus:ring-indigo-200 outline-none"
                                        value={selectedOutlierCol}
                                        onChange={(e) => { setSelectedOutlierCol(e.target.value); setOutlierCount(null); setOutlierStats(null); }}
                                    >
                                        <option value="">Select Numeric Col...</option>
                                        {stats.filter(s => s.type === 'numeric').map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                    <button onClick={handleCheckOutliers} disabled={!selectedOutlierCol} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium hover:bg-slate-50">Check</button>
                                    {outlierCount !== null && (
                                        <div className="flex items-center gap-2 ml-2">
                                            <span className={`text-sm font-bold ${outlierCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{outlierCount} Found</span>
                                        </div>
                                    )}
                                </div>

                                {/* Outlier Stats & Fixes */}
                                {outlierCount !== null && outlierCount > 0 && outlierStats && (
                                    <div className="mt-3 p-3 bg-white border border-slate-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center text-xs text-slate-600 mb-2 border-b border-slate-100 pb-2">
                                            <span>Mean: <b>{outlierStats.mean.toFixed(1)}</b></span>
                                            <span>Median: <b>{outlierStats.median.toFixed(1)}</b></span>
                                            <span>Mode: <b>{outlierStats.mode}</b></span>
                                        </div>
                                        {outlierValues.length > 0 && (
                                            <div className="text-[10px] text-slate-500 mb-2 font-mono break-all">
                                                <span className="font-bold text-slate-400">Values:</span> {outlierValues.join(', ')}{outlierValues.length === 10 ? '...' : ''}
                                            </div>
                                        )}
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={outlierFixStrategy}
                                                onChange={(e) => setOutlierFixStrategy(e.target.value as any)}
                                                className="text-xs p-1.5 border rounded bg-white"
                                            >
                                                <option value="remove">Remove Rows</option>
                                                <option value="mean">Impute Mean</option>
                                                <option value="median">Impute Median</option>
                                                <option value="mode">Impute Mode</option>
                                                <option value="custom">Custom Value</option>
                                            </select>
                                            {outlierFixStrategy === 'custom' && (
                                                <input
                                                    value={customOutlierValue}
                                                    onChange={(e) => setCustomOutlierValue(e.target.value)}
                                                    placeholder="Val"
                                                    className="w-16 text-xs p-1.5 border rounded"
                                                />
                                            )}
                                            <button onClick={handleApplyOutlierFix} className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded font-bold hover:bg-red-100">Fix</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Descriptive Statistics Cards */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                                <BarChart3 size={16} /> Descriptive Statistics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {stats.slice(0, 8).map((stat, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                        <div className="flex justify-between items-start mb-2">
                                            <strong className="truncate w-full" title={stat.name}>{stat.name}</strong>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${stat.type === 'numeric' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{stat.type === 'numeric' ? '#' : 'ABC'}</span>
                                        </div>
                                        {stat.type === 'numeric' ? (
                                            <div className="space-y-1 text-slate-600">
                                                <div className="flex justify-between"><span>Avg</span> <b>{stat.avg?.toFixed(1)}</b></div>
                                                <div className="flex justify-between"><span>Min</span> <b>{stat.min}</b></div>
                                                <div className="flex justify-between"><span>Max</span> <b>{stat.max}</b></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-slate-600">
                                                <div className="text-[10px] text-slate-400 font-semibold">Top Value</div>
                                                <div className="flex justify-between">
                                                    <span className="truncate max-w-[80px]">{stat.topValues?.[0]?.value}</span>
                                                    <b>{stat.topValues?.[0]?.count}</b>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-slate-400">
                                            <Hash size={10} /> {stat.uniqueCount} unique
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Data Table */}
                        <table className="w-full text-left text-sm mt-4">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Column</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Missing</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {qualityReport.columns.map(col => (
                                    <tr key={col.name} className="hover:bg-slate-50 group">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {editingCol === col.name ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={tempName}
                                                        onChange={(e) => setTempName(e.target.value)}
                                                        className="border rounded px-2 py-1 text-xs w-32"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleRenameColumn(col.name)}><Save size={14} className="text-green-600" /></button>
                                                    <button onClick={() => setEditingCol(null)}><X size={14} className="text-slate-400" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {col.name}
                                                    <button onClick={() => { setEditingCol(col.name); setTempName(col.name); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600">
                                                        <Scissors size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{col.type}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className={`h-full ${col.missingPercentage > 0 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(col.missingPercentage, 100)}%` }}></div>
                                                </div>
                                                <span className="text-xs text-slate-500">{col.missingPercentage.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {col.missingPercentage === 0 ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">
                                                    <CheckCircle2 size={12} /> Clean
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenFixModal(col)}
                                                        className="p-1 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors shadow-sm"
                                                        title="AI Remediation"
                                                    >
                                                        <Wand2 size={12} />
                                                    </button>
                                                    {(col.type === 'date' || col.name.toLowerCase().includes('date')) && (
                                                        <button
                                                            onClick={() => handleStandardizeDate(col.name)}
                                                            className="p-1 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors shadow-sm"
                                                            title="Standardize Dates"
                                                        >
                                                            <Calculator size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDropColumn(col.name)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-red-50 hover:text-red-600" title="Drop Column">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : activeTab === 'transform' ? (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Manual AI Prompt Area */}
                        <div className="bg-indigo-900 text-white p-6 rounded-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-bold flex items-center gap-2 text-lg mb-2"><Bot size={20} /> Custom AI Transform</h3>
                                <p className="text-indigo-200 text-sm mb-4">Describe any calculation, extraction, or formula. The AI will build it for you.</p>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 p-3 rounded-lg text-slate-900 text-sm focus:outline-none shadow-lg"
                                        placeholder="e.g. 'Create BMI from Weight and Height' or 'Extract Domain from Email'"
                                        value={customTransformInput}
                                        onChange={(e) => setCustomTransformInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCustomTransform()}
                                    />
                                    <button
                                        onClick={handleCustomTransform}
                                        disabled={isGeneratingCustom || !customTransformInput.trim()}
                                        className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isGeneratingCustom ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        Apply
                                    </button>
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        </div>

                        <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <div>
                                <h3 className="font-bold text-purple-900">Recommended Suggestions</h3>
                                <p className="text-sm text-purple-700">Auto-detected opportunities for engineering features.</p>
                            </div>
                            <button
                                onClick={handleGetTransformSuggestions}
                                disabled={isSuggesting}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                            >
                                {isSuggesting ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                Generate Ideas
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {suggestions.map(s => (
                                <div key={s.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800">{s.title}</h4>
                                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">{s.type}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">{s.description}</p>
                                    <button
                                        onClick={() => handleApplyTransformation(s)}
                                        className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16} /> Apply Transform
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'merge' ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setMergeStrategy('join')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mergeStrategy === 'join' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            >
                                Join (Side-by-Side)
                            </button>
                            <button
                                onClick={() => setMergeStrategy('union')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mergeStrategy === 'union' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            >
                                Union (Stack)
                            </button>
                            <button
                                onClick={() => setMergeStrategy('lookup')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${mergeStrategy === 'lookup' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            >
                                Lookup (Add Data)
                            </button>
                        </div>

                        {/* AI Merge Advisor */}
                        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div>
                                <h3 className="font-bold text-blue-900 flex items-center gap-2"><Lightbulb size={16} /> AI Merge Advisor</h3>
                                <p className="text-sm text-blue-700">Not sure how to combine these files? Let AI analyze the schemas.</p>
                            </div>
                            <button
                                onClick={handleSuggestMerge}
                                disabled={isMergingAI || datasets.length < 2}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isMergingAI ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                                Suggest Strategy
                            </button>
                        </div>
                        {mergeReason && (
                            <div className="bg-white border border-blue-200 p-4 rounded-lg animate-in fade-in">
                                <div className="text-xs font-bold text-blue-500 uppercase mb-1">AI Recommendation</div>
                                <p className="text-slate-700 text-sm">{mergeReason}</p>
                            </div>
                        )}

                        {mergeStrategy === 'join' && (
                            <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Left Dataset</label>
                                    <select
                                        value={mergeDsA}
                                        onChange={(e) => setMergeDsA(e.target.value)}
                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                    >
                                        <option value="">Select...</option>
                                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <input
                                        placeholder="Join Key Column (e.g. ID)"
                                        value={mergeKeys.keyA}
                                        onChange={(e) => setMergeKeys({ ...mergeKeys, keyA: e.target.value })}
                                        className="w-full mt-2 p-2 rounded border border-slate-300 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Right Dataset</label>
                                    <select
                                        value={mergeDsB}
                                        onChange={(e) => setMergeDsB(e.target.value)}
                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                    >
                                        <option value="">Select...</option>
                                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <input
                                        placeholder="Join Key Column (e.g. ID)"
                                        value={mergeKeys.keyB}
                                        onChange={(e) => setMergeKeys({ ...mergeKeys, keyB: e.target.value })}
                                        className="w-full mt-2 p-2 rounded border border-slate-300 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {mergeStrategy === 'union' && (
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Select Files to Stack</label>
                                    <div className="max-h-60 overflow-y-auto bg-white border border-slate-300 rounded-lg p-2 space-y-2">
                                        {datasets.map(d => {
                                            const isSelected = unionSelectedIds.has(d.id);
                                            return (
                                                <div key={d.id}
                                                    className={`p-2 rounded-lg border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                                                >
                                                    <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => toggleUnionId(d.id)}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => { }}
                                                            className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                                                        />
                                                        <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-slate-700'}`}>{d.name}</span>
                                                        <span className="text-xs text-slate-400 ml-auto">{d.data.length} rows</span>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="ml-6 mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                                            <span className="text-[10px] text-indigo-500 font-bold uppercase whitespace-nowrap">
                                                                Value for '{unionNewColName || 'Source'}':
                                                            </span>
                                                            <input
                                                                value={unionMappings[d.id] || ''}
                                                                onChange={(e) => handleUnionMappingChange(d.id, e.target.value)}
                                                                placeholder={d.name}
                                                                className="flex-1 p-1.5 text-xs border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Selected: {unionSelectedIds.size} files</p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Stack Selection & New Source Key</label>
                                    <p className="text-xs text-slate-400 mb-2">Creates a new column to identify which file the row came from.</p>
                                    <input
                                        placeholder="New Source Column Name (e.g. 'Month', 'Department')"
                                        value={unionNewColName}
                                        onChange={(e) => setUnionNewColName(e.target.value)}
                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {mergeStrategy === 'lookup' && (
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2"><ArrowRightCircle size={16} /> Add Data from File to File</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target File (To Enrich)</label>
                                        <select value={mergeDsA} onChange={(e) => setMergeDsA(e.target.value)} className="w-full p-2 rounded border border-slate-300 text-sm">
                                            <option value="">Select...</option>
                                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Source File (Where Data Is)</label>
                                        <select value={mergeDsB} onChange={(e) => setMergeDsB(e.target.value)} className="w-full p-2 rounded border border-slate-300 text-sm">
                                            <option value="">Select...</option>
                                            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Connect Key (Common ID)</label>
                                    <input
                                        value={mergeKeys.keyA}
                                        onChange={(e) => setMergeKeys({ ...mergeKeys, keyA: e.target.value })}
                                        placeholder="e.g. EmployeeID"
                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                    />
                                </div>
                                {mergeDsB && (
                                    <div className="bg-white p-3 rounded border border-slate-200 h-32 overflow-y-auto">
                                        <div className="text-xs font-bold text-slate-400 mb-2">Select Columns to Add:</div>
                                        {Object.keys(datasets.find(d => d.id === mergeDsB)?.data[0] || {}).map(col => (
                                            <label key={col} className="flex items-center gap-2 text-sm text-slate-700 mb-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={enrichSelectedCols.has(col)}
                                                    onChange={() => toggleEnrichCol(col)}
                                                />
                                                {col}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Result Dataset Name</label>
                                <input
                                    value={mergedName}
                                    onChange={(e) => setMergedName(e.target.value)}
                                    placeholder="e.g. Merged_Master_Data"
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <button
                                onClick={handleExecuteMerge}
                                disabled={
                                    (mergeStrategy === 'join' && (!mergeDsA || !mergeDsB || !mergeKeys.keyA || !mergeKeys.keyB)) ||
                                    (mergeStrategy === 'union' && unionSelectedIds.size < 2) ||
                                    (mergeStrategy === 'lookup' && (!mergeDsA || !mergeDsB || !mergeKeys.keyA || enrichSelectedCols.size === 0))
                                }
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 h-fit mb-0.5"
                            >
                                <Combine size={18} /> Execute
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'hypothesis' ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl">
                            <h3 className="text-xl font-bold text-orange-900 flex items-center gap-2 mb-2">
                                <Calculator size={24} /> Hypothesis Lab
                            </h3>
                            <p className="text-orange-700 text-sm">Run rigorous statistical tests to validate patterns in your data.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Test Type</label>
                                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => { setHypoTestType('ttest'); setHypoResult(null); }}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded ${hypoTestType === 'ttest' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            T-Test
                                        </button>
                                        <button
                                            onClick={() => { setHypoTestType('chisquare'); setHypoResult(null); }}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded ${hypoTestType === 'chisquare' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Chi-Square
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        {hypoTestType === 'ttest' ? 'Group A (Numeric)' : 'Variable A (Categorical)'}
                                    </label>
                                    <select
                                        value={hypoColA}
                                        onChange={(e) => setHypoColA(e.target.value)}
                                        className="w-full p-2 text-sm border rounded bg-white"
                                    >
                                        <option value="">Select Column...</option>
                                        {stats.filter(s => hypoTestType === 'ttest' ? s.type === 'numeric' : true).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                        {hypoTestType === 'ttest' ? 'Group B (Numeric)' : 'Variable B (Categorical)'}
                                    </label>
                                    <select
                                        value={hypoColB}
                                        onChange={(e) => setHypoColB(e.target.value)}
                                        className="w-full p-2 text-sm border rounded bg-white"
                                    >
                                        <option value="">Select Column...</option>
                                        {stats.filter(s => hypoTestType === 'ttest' ? s.type === 'numeric' : true).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    onClick={handleRunHypothesisTest}
                                    disabled={!hypoColA || !hypoColB}
                                    className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Calculator size={16} /> Run Statistical Test
                                </button>
                            </div>

                            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 min-h-[300px] flex flex-col">
                                {!hypoResult ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                        <Calculator size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm">Configure and run a test to see results here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-lg text-slate-800">Test Result</h4>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${hypoResult.pValue < 0.05 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {hypoResult.pValue < 0.05 ? 'Statistically Significant' : 'Not Significant'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-500 uppercase font-bold">{hypoTestType === 'ttest' ? 'T-Statistic' : 'Chi-Square'}</div>
                                                <div className="text-2xl font-bold text-slate-800 mt-1">
                                                    {hypoTestType === 'ttest' ? hypoResult.tStatistic.toFixed(4) : hypoResult.chiSquare.toFixed(4)}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="text-xs text-slate-500 uppercase font-bold">P-Value</div>
                                                <div className="text-2xl font-bold text-slate-800 mt-1">{hypoResult.pValue.toFixed(6)}</div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                                                <div className="text-xs text-slate-500 uppercase font-bold">Degrees of Freedom (df)</div>
                                                <div className="text-2xl font-bold text-slate-800 mt-1">{hypoResult.df || hypoResult.degreeOfFreedom}</div>
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-lg border ${hypoResult.pValue < 0.05 ? 'bg-green-50 border-green-100 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                            <p className="text-sm leading-relaxed">
                                                {hypoResult.pValue < 0.05
                                                    ? `There is a statistically significant relationship between ${hypoColA} and ${hypoColB} (p < 0.05). You can reject the null hypothesis with 95% confidence.`
                                                    : `There is no statistically significant relationship observed (p >= 0.05). We fail to reject the null hypothesis.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* AI FIX MODAL */}
            {fixModalOpen && activeFixCol && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 relative border border-slate-200">
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Sparkles className="text-indigo-600" size={20} /> AI Remediation
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Fixing column: <span className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded">{activeFixCol.name}</span></p>
                                </div>
                                <button onClick={() => setFixModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2 items-start">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>
                                    <b>{activeFixCol.missingPct.toFixed(1)}%</b> of data is missing. The AI model suggests strategies based on the <b>{activeFixCol.type}</b> data type.
                                </span>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                                    <input
                                        type="radio"
                                        name="fixStrategy"
                                        checked={columnFixStrategy === 'recommendation'}
                                        onChange={() => setColumnFixStrategy('recommendation')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700 group-hover:text-indigo-700">AI Recommendation</span>
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Best</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Auto-fill with {activeFixCol.type === 'number' ? 'Mean (Average)' : 'Mode (Most Frequent)'}.
                                        </p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                                    <input
                                        type="radio"
                                        name="fixStrategy"
                                        checked={columnFixStrategy === 'custom'}
                                        onChange={() => setColumnFixStrategy('custom')}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-700 group-hover:text-indigo-700">Manual Input</div>
                                        <p className="text-xs text-slate-500 mt-1">Fill missing cells with a specific value.</p>
                                        {columnFixStrategy === 'custom' && (
                                            <input
                                                value={columnFixCustomVal}
                                                onChange={(e) => setColumnFixCustomVal(e.target.value)}
                                                placeholder="Enter value..."
                                                className="mt-2 w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 border border-red-100 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red-50 transition-all group">
                                    <input
                                        type="radio"
                                        name="fixStrategy"
                                        checked={columnFixStrategy === 'remove'}
                                        onChange={() => setColumnFixStrategy('remove')}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-700 group-hover:text-red-700">Remove Rows</div>
                                        <p className="text-xs text-slate-500 mt-1">Delete all rows containing missing values in this column.</p>
                                    </div>
                                </label>

                                {(activeFixCol.type === 'date' || activeFixCol.name.toLowerCase().includes('date')) && (
                                    <label className="flex items-center gap-3 p-3 border border-purple-100 rounded-xl cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all group">
                                        <input
                                            type="radio"
                                            name="fixStrategy"
                                            checked={columnFixStrategy === 'standardize'}
                                            onChange={() => setColumnFixStrategy('standardize')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-700 group-hover:text-purple-700">Standardize Date Format</div>
                                            <p className="text-xs text-slate-500 mt-1">Convert all dates to a consistent YYYY-MM-DD format.</p>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setFixModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                            <button
                                onClick={handleApplyColumnFix}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center gap-2"
                            >
                                <Sparkles size={16} /> Apply Fix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataStudio;
