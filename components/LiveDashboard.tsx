import React, { useState, useEffect, useCallback } from 'react';
import { PatientRecord, ChartConfig, SavedDashboard, ReportItem } from '../types';
import Dashboard from './Dashboard';
import { generateDashboardLayout } from '../services/geminiService';
import { generateQualityReport } from '../services/dataService';
import { Save, FolderOpen, Plus, Trash2, RefreshCw, Clock, Edit2, Check, X, MoreVertical, LayoutDashboard, Sparkles, Layout } from 'lucide-react';

interface LiveDashboardProps {
    data: PatientRecord[];
    goal: string;
    onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
    onBack?: () => void;
    datasetId?: string;
}

const STORAGE_KEY = 'vision_saved_dashboards';

// Load dashboards from localStorage
const loadSavedDashboards = (): SavedDashboard[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading saved dashboards:', error);
        return [];
    }
};

// Save dashboards to localStorage
const saveDashboardsToStorage = (dashboards: SavedDashboard[]): boolean => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
        return true;
    } catch (error) {
        console.error('Error saving dashboards:', error);
        return false;
    }
};

const LiveDashboard: React.FC<LiveDashboardProps> = ({ data, goal, onAddToReport, onBack, datasetId }) => {
    // Dashboard state
    const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
    const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
    const [currentConfig, setCurrentConfig] = useState<ChartConfig[]>([]);
    const [isNewDashboard, setIsNewDashboard] = useState(true);

    // UI state
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showDashboardList, setShowDashboardList] = useState(false);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // AI & Template state
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateDescription, setTemplateDescription] = useState('');

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(30); // seconds
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // Load saved dashboards on mount
    useEffect(() => {
        const dashboards = loadSavedDashboards();
        setSavedDashboards(dashboards);
    }, []);

    // Auto-refresh timer
    useEffect(() => {
        if (!autoRefresh) return;

        const timer = setInterval(() => {
            setLastRefresh(new Date());
            // Data refresh happens automatically through React re-render
        }, refreshInterval * 1000);

        return () => clearInterval(timer);
    }, [autoRefresh, refreshInterval]);

    // Get active dashboard
    const activeDashboard = savedDashboards.find(d => d.id === activeDashboardId);

    // Handle saving a new dashboard
    const handleSaveDashboard = useCallback(() => {
        if (!newDashboardName.trim()) return;

        const columns = data.length > 0 ? Object.keys(data[0]) : [];

        const newDashboard: SavedDashboard = {
            id: Date.now().toString(),
            name: newDashboardName.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            datasetId: saveAsTemplate ? undefined : datasetId, // Templates are not tied to a dataset
            config: currentConfig,
            autoRefreshInterval: autoRefresh ? refreshInterval : 0,
            isTemplate: saveAsTemplate,
            requiredColumns: saveAsTemplate ? columns : undefined,
            description: saveAsTemplate ? (templateDescription || 'Custom template') : undefined
        };

        const updated = [...savedDashboards, newDashboard];
        setSavedDashboards(updated);
        saveDashboardsToStorage(updated);
        setActiveDashboardId(newDashboard.id);
        setIsNewDashboard(false);
        setShowSaveModal(false);
        setNewDashboardName('');
        setSaveAsTemplate(false);
        setTemplateDescription('');
    }, [newDashboardName, currentConfig, savedDashboards, datasetId, autoRefresh, refreshInterval, saveAsTemplate, templateDescription, data]);

    // Handle Auto-Generate
    const handleAutoGenerate = async () => {
        if (!data || data.length === 0) return;

        setIsGenerating(true);
        try {
            const columns = Object.keys(data[0]);
            const qualityReport = generateQualityReport(data);
            const summary = `
                Rows: ${qualityReport.totalRows}, Columns: ${qualityReport.totalColumns}
                Column Profiles:
                ${qualityReport.columns.map(c => `- ${c.name} (${c.type})`).join('\n')}
            `;

            const result = await generateDashboardLayout(summary, columns);

            // Validate config against actual columns to prevent empty charts
            const validConfig = result.config.filter(c => {
                const isValidDataKey = c.dataKey === 'count' || columns.includes(c.dataKey);
                const isValidXAxis = !c.xAxisKey || columns.includes(c.xAxisKey);
                return isValidDataKey && isValidXAxis;
            });

            setCurrentConfig(validConfig);
            setTemplateDescription(result.description); // Auto-fill description for templates
            setActiveDashboardId(null);
            setIsNewDashboard(true);
        } catch (err) {
            console.error("Auto-generate failed", err);
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle updating an existing dashboard
    const handleUpdateDashboard = useCallback(() => {
        if (!activeDashboardId) return;

        const updated = savedDashboards.map(d =>
            d.id === activeDashboardId
                ? { ...d, config: currentConfig, updatedAt: new Date().toISOString(), autoRefreshInterval: autoRefresh ? refreshInterval : 0 }
                : d
        );
        setSavedDashboards(updated);
        saveDashboardsToStorage(updated);
    }, [activeDashboardId, currentConfig, savedDashboards, autoRefresh, refreshInterval]);

    // Handle loading a dashboard
    const handleLoadDashboard = useCallback((dashboard: SavedDashboard) => {
        setCurrentConfig(dashboard.config);
        setActiveDashboardId(dashboard.id);
        setIsNewDashboard(false);
        setShowDashboardList(false);
        if (dashboard.autoRefreshInterval && dashboard.autoRefreshInterval > 0) {
            setAutoRefresh(true);
            setRefreshInterval(dashboard.autoRefreshInterval);
        }
    }, []);

    // Handle deleting a dashboard
    const handleDeleteDashboard = useCallback((id: string) => {
        if (!confirm('Are you sure you want to delete this dashboard?')) return;

        const updated = savedDashboards.filter(d => d.id !== id);
        setSavedDashboards(updated);
        saveDashboardsToStorage(updated);

        if (activeDashboardId === id) {
            setActiveDashboardId(null);
            setCurrentConfig([]);
            setIsNewDashboard(true);
        }
    }, [savedDashboards, activeDashboardId]);

    // Handle renaming a dashboard
    const handleRenameDashboard = useCallback((id: string) => {
        if (!editingName.trim()) {
            setEditingNameId(null);
            return;
        }

        const updated = savedDashboards.map(d =>
            d.id === id ? { ...d, name: editingName.trim(), updatedAt: new Date().toISOString() } : d
        );
        setSavedDashboards(updated);
        saveDashboardsToStorage(updated);
        setEditingNameId(null);
        setEditingName('');
    }, [editingName, savedDashboards]);

    // Handle creating a new dashboard
    const handleNewDashboard = useCallback(() => {
        setActiveDashboardId(null);
        setCurrentConfig([]);
        setIsNewDashboard(true);
        setShowDashboardList(false);
    }, []);

    // Manual refresh
    const handleManualRefresh = useCallback(() => {
        setLastRefresh(new Date());
    }, []);

    return (
        <div className="h-full flex flex-col">
            {/* Dashboard Header with Save/Load Controls */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="text-indigo-600" size={24} />
                        <div>
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                {activeDashboard?.name || 'New Dashboard'}
                                {activeDashboard?.isTemplate && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full uppercase font-bold tracking-wider">Template</span>}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {isNewDashboard ? 'Unsaved' : `Last saved: ${new Date(activeDashboard?.updatedAt || '').toLocaleString()}`}
                            </p>
                        </div>
                    </div>

                    {/* Dashboard Selector Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDashboardList(!showDashboardList)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors"
                        >
                            <FolderOpen size={16} />
                            Load Dashboard
                        </button>

                        {/* Dashboard List Dropdown */}
                        {showDashboardList && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDashboardList(false)} />
                                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                                    <div className="p-3 border-b border-slate-100">
                                        <button
                                            onClick={handleNewDashboard}
                                            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <Plus size={16} />
                                            Create New Dashboard
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {/* My Dashboards Section */}
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                                            My Dashboards
                                        </div>
                                        {savedDashboards.filter(d => !d.isTemplate).length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm italic">
                                                No saved dashboards
                                            </div>
                                        ) : (
                                            savedDashboards.filter(d => !d.isTemplate).map(dashboard => (
                                                <div
                                                    key={dashboard.id}
                                                    className={`p-3 hover:bg-slate-50 flex items-center justify-between group cursor-pointer ${activeDashboardId === dashboard.id ? 'bg-indigo-50' : ''}`}
                                                >
                                                    {/* Existing list item code reused implicitly or reconstructed */}
                                                    <div onClick={() => handleLoadDashboard(dashboard)} className="flex-1">
                                                        <div className="font-medium text-sm text-slate-800">{dashboard.name}</div>
                                                        <div className="text-xs text-slate-400">
                                                            {dashboard.config.length} charts • {new Date(dashboard.updatedAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(dashboard.id); }}
                                                        className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}

                                        {/* Templates Section */}
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-amber-50">
                                            Templates
                                        </div>
                                        {savedDashboards.filter(d => d.isTemplate).length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm italic">
                                                No templates available
                                            </div>
                                        ) : (
                                            savedDashboards.filter(d => d.isTemplate).map(dashboard => (
                                                <div
                                                    key={dashboard.id}
                                                    className={`p-3 hover:bg-amber-50 flex items-center justify-between group cursor-pointer ${activeDashboardId === dashboard.id ? 'bg-amber-100' : ''}`}
                                                >
                                                    <div onClick={() => handleLoadDashboard(dashboard)} className="flex-1">
                                                        <div className="font-medium text-sm text-slate-800 flex items-center gap-2">
                                                            <Layout size={14} className="text-amber-500" />
                                                            {dashboard.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 italic mt-0.5">
                                                            {dashboard.description || 'No description'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-1">
                                                            Requires: {dashboard.requiredColumns?.slice(0, 3).join(', ')}{dashboard.requiredColumns && dashboard.requiredColumns.length > 3 ? '...' : ''}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteDashboard(dashboard.id); }}
                                                        className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center gap-3">
                    {/* Auto-Generate Button */}
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating}
                        className="px-3 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                    >
                        {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        Auto-Generate
                    </button>

                    {/* Auto-refresh Toggle */}
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <Clock size={14} className={autoRefresh ? 'text-green-600' : 'text-slate-400'} />
                        <label className="text-xs text-slate-600 flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded text-indigo-600"
                            />
                            Auto-refresh
                        </label>
                        {autoRefresh && (
                            <select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                className="text-xs border-0 bg-transparent text-slate-600"
                            >
                                <option value={15}>15s</option>
                                <option value={30}>30s</option>
                                <option value={60}>1m</option>
                                <option value={300}>5m</option>
                            </select>
                        )}
                    </div>

                    {/* Manual Refresh Button */}
                    <button
                        onClick={handleManualRefresh}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                        title={`Last refresh: ${lastRefresh.toLocaleTimeString()}`}
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Save Button */}
                    {isNewDashboard ? (
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} />
                            Save Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={handleUpdateDashboard}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} />
                            Update
                        </button>
                    )}
                </div>
            </div>

            {/* Dashboard Content - Uses existing Dashboard component */}
            <div className="flex-1 overflow-y-auto p-6">
                <Dashboard
                    data={data}
                    goal={goal}
                    config={currentConfig}
                    onAddToReport={onAddToReport}
                    onBack={onBack}
                />
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSaveModal(false)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-96">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Save Dashboard</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Dashboard Name</label>
                                <input
                                    type="text"
                                    value={newDashboardName}
                                    onChange={(e) => setNewDashboardName(e.target.value)}
                                    placeholder="e.g., Sales Overview Q4"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDashboard(); }}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveAsTemplate}
                                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">Save as Template</span>
                                </label>
                                {saveAsTemplate && (
                                    <div className="pl-6 text-xs text-slate-500">
                                        Templates can be applied to other datasets with similar columns.
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDashboard}
                                    disabled={!newDashboardName.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LiveDashboard;
