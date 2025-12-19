
import React, { useMemo, useState } from 'react';
import { DataQualityReport, ReportItem, PatientRecord, ColumnProfile } from '../types';
import { generateColumnStatistics, imputeMissingValues, renameColumnInDataset, removeRowsWithMissing, dropColumn, detectOutliersZScore, removeOutliersZScore } from '../services/dataService';
import { CheckCircle, AlertTriangle, FileText, Activity, Plus, BarChart3, TrendingUp, Hash, Edit2, Wand2, Save, X, RotateCcw, Trash2, ArrowRight, Sparkles } from 'lucide-react';

interface DataQualityProps {
  report: DataQualityReport;
  data: PatientRecord[];
  onNext: () => void;
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
  onDataUpdate: (newData: PatientRecord[]) => void;
}

const DataQuality: React.FC<DataQualityProps> = ({ report, data, onNext, onAddToReport, onDataUpdate }) => {
  const stats = useMemo(() => generateColumnStatistics(data), [data]);

  // Edit State
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  // Fix Modal State
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [selectedFixCol, setSelectedFixCol] = useState<ColumnProfile | null>(null);
  const [customFillValue, setCustomFillValue] = useState("");

  const handleAddSummary = () => {
    onAddToReport({
      type: 'quality',
      title: 'Data Quality Summary Report',
      content: `Score: ${report.score}/100. Rows: ${report.totalRows}. Critical Issues: ${report.issues.length}. Issues List: ${report.issues.join(', ')}`
    });
  };

  const handleAddStats = () => {
    onAddToReport({
      type: 'quality',
      title: 'Descriptive Statistics Summary',
      content: `Analyzed ${stats.length} columns. Key insights: ` + stats.map(s => s.type === 'numeric' ? `${s.name} (Avg: ${s.avg?.toFixed(2)})` : `${s.name} (Top: ${s.topValues?.[0]?.value})`).join(', ')
    });
  };

  const startEditing = (colName: string) => {
    setEditingCol(colName);
    setTempName(colName);
  };

  const saveColumnName = (oldName: string) => {
    if (tempName && tempName !== oldName) {
      const newData = renameColumnInDataset(data, oldName, tempName);
      onDataUpdate(newData);
    }
    setEditingCol(null);
  };

  const openFixModal = (col: ColumnProfile) => {
    setSelectedFixCol(col);
    setFixModalOpen(true);
    setCustomFillValue("");
  };

  const applyFix = (strategy: 'mean' | 'mode' | 'custom' | 'remove_rows' | 'drop_col' | 'remove_outliers_z') => {
    if (!selectedFixCol) return;

    let newData = [...data];
    const colName = selectedFixCol.name;

    if (strategy === 'remove_rows') {
      newData = removeRowsWithMissing(newData, colName);
    } else if (strategy === 'drop_col') {
      newData = dropColumn(newData, colName);
    } else if (strategy === 'remove_outliers_z') {
      newData = removeOutliersZScore(newData, colName, 3);
    } else {
      newData = imputeMissingValues(newData, colName, strategy, customFillValue);
    }

    onDataUpdate(newData);
    setFixModalOpen(false);
    setSelectedFixCol(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Quality & Statistics</h2>
          <p className="text-slate-500">Analysis of {report.totalRows} records across {report.totalColumns} columns.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAddSummary}
            className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Add Quality Report
          </button>
          <button
            onClick={onNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            Proceed to Introspection <Activity size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="text-blue-500" />
            <h3 className="font-semibold text-slate-700">Health Score</h3>
          </div>
          <div className="text-4xl font-bold text-slate-800">{report.score}/100</div>
          <p className="text-sm text-slate-500 mt-1">Based on completeness and consistency.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-purple-500" />
            <h3 className="font-semibold text-slate-700">Completeness</h3>
          </div>
          <div className="text-4xl font-bold text-slate-800">
            {Math.round(report.columns.reduce((a, b) => a + (100 - b.missingPercentage), 0) / report.totalColumns)}%
          </div>
          <p className="text-sm text-slate-500 mt-1">Average column fill rate.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-amber-500" />
            <h3 className="font-semibold text-slate-700">Critical Issues</h3>
          </div>
          <div className="text-4xl font-bold text-slate-800">{report.issues.length}</div>
          <p className="text-sm text-slate-500 mt-1">Requires attention.</p>
        </div>
      </div>

      {/* Descriptive Statistics Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" /> Descriptive Statistics
          </h3>
          <button onClick={handleAddStats} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1">
            <Plus size={14} /> Add Stats to Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-slate-800 text-sm truncate pr-2" title={stat.name}>{stat.name}</h4>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${stat.type === 'numeric' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {stat.type === 'numeric' ? '#' : 'ABC'}
                </span>
              </div>

              {stat.type === 'numeric' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Avg</span>
                    <span className="font-mono font-medium text-slate-800">{stat.avg?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Min</span>
                    <span className="font-mono font-medium text-slate-800">{stat.min?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Max</span>
                    <span className="font-mono font-medium text-slate-800">{stat.max?.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 font-semibold uppercase mb-1">Top Values</div>
                  {stat.topValues?.map((val, vIdx) => (
                    <div key={vIdx} className="flex justify-between items-center text-sm">
                      <span className="truncate max-w-[120px] text-slate-700" title={val.value}>{val.value}</span>
                      <span className="text-slate-400 text-xs bg-slate-50 px-1.5 rounded">{val.count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs text-slate-400">
                <Hash size={12} /> {stat.uniqueCount} unique values
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Column Quality Profile</h3>
          <span className="text-xs text-slate-400">Editable Fields</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Column Name</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Missing</th>
                <th className="px-6 py-3 font-medium">Unique Values</th>
                <th className="px-6 py-3 font-medium">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.columns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    {editingCol === col.name ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="border border-indigo-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-200 outline-none w-32"
                          autoFocus
                        />
                        <button onClick={() => saveColumnName(col.name)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                        <button onClick={() => setEditingCol(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        {col.name}
                        <button onClick={() => startEditing(col.name)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500 capitalize">{col.type}</td>
                  <td className="px-6 py-3 text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${col.missingPercentage > 20 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(col.missingPercentage, 100)}%` }}
                        />
                      </div>
                      <span>{col.missingPercentage.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{col.uniqueCount}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {col.missingPercentage < 5 ? (
                        <span className="inline-flex items-center gap-1 text-green-600 px-2 py-1 bg-green-50 rounded-full text-xs font-medium">
                          <CheckCircle size={12} /> Good
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 px-2 py-1 bg-amber-50 rounded-full text-xs font-medium">
                          <AlertTriangle size={12} /> Check
                        </span>
                      )}

                      {(col.missingPercentage > 0 || col.type === 'number') && (
                        <button
                          onClick={() => openFixModal(col)}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-indigo-100"
                          title="Fix issues"
                        >
                          <Wand2 size={12} /> Fix
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIX MODAL */}
      {fixModalOpen && selectedFixCol && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 border border-slate-200 transform scale-100 animate-in zoom-in-95 relative overflow-hidden">
            {/* Decorative Background Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Sparkles className="text-indigo-500" size={18} /> Fix Data Issues
                </h3>
                <p className="text-xs text-slate-500 mt-1">Column: <span className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">{selectedFixCol.name}</span></p>
              </div>
              <button onClick={() => setFixModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-1 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-5 text-xs text-amber-800 flex gap-2 items-start">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{selectedFixCol.missingCount} rows</span> ({selectedFixCol.missingPercentage.toFixed(1)}%) missing values detected.
                Suggesting fix based on type: <strong className="uppercase">{selectedFixCol.type}</strong>.
              </div>
            </div>

            <div className="space-y-3">
              {/* Smart Suggestion for Numeric */}
              {selectedFixCol.type === 'number' && (
                <button
                  onClick={() => applyFix('mean')}
                  className="w-full text-left p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition-all group relative"
                >
                  <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Recommended</div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-700 text-sm">Auto-Fill with Mean</div>
                  <div className="text-xs text-slate-500 mt-0.5">Replace missing values with the column average.</div>
                </button>
              )}

              {/* Smart Suggestion for Categorical */}
              {(selectedFixCol.type === 'string' || selectedFixCol.type === 'boolean') && (
                <button
                  onClick={() => applyFix('mode')}
                  className="w-full text-left p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 transition-all group relative"
                >
                  <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Recommended</div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-700 text-sm">Auto-Fill with Mode</div>
                  <div className="text-xs text-slate-500 mt-0.5">Replace missing with most frequent value.</div>
                </button>
              )}

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/30">
                <div className="font-semibold text-slate-700 text-sm mb-2">Fill with Custom Value</div>
                <div className="flex gap-2">
                  <input
                    value={customFillValue}
                    onChange={(e) => setCustomFillValue(e.target.value)}
                    placeholder="e.g. 0, N/A"
                    className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                  <button onClick={() => applyFix('custom')} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-indigo-700 transition-colors">Apply</button>
                </div>
              </div>

              <button
                onClick={() => applyFix('remove_rows')}
                className="w-full text-left p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-all group mt-2"
              >
                <div className="font-semibold text-red-700 text-sm flex items-center gap-2"><Trash2 size={14} /> Remove Missing Rows</div>
                <div className="text-xs text-red-500 mt-0.5">Delete {selectedFixCol.missingCount} rows with nulls.</div>
              </button>

              {selectedFixCol.type === 'number' && (
                <button
                  onClick={() => applyFix('remove_outliers_z')}
                  className="w-full text-left p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all group mt-2"
                >
                  <div className="font-semibold text-amber-700 text-sm flex items-center gap-2"><TrendingUp size={14} /> Clean Outliers (Z-score)</div>
                  <div className="text-xs text-amber-600 mt-0.5">Remove data points &gt; 3 std devs from mean.</div>
                </button>
              )}

              <button
                onClick={() => applyFix('drop_col')}
                className="w-full text-center text-xs text-slate-400 hover:text-red-600 mt-2 p-2 hover:underline decoration-red-200"
              >
                Drop Column Entirely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataQuality;
