import React, { useState, useEffect } from 'react';
import { ColumnProfile, RoadmapStep, Recommendation, PatientRecord, ChartConfig, ReportItem, GoalAnalysisResult } from '../types';
import { generateGoalRoadmap, generateRecommendationAnalysis, generateGoalSuggestions } from '../services/geminiService';
import { generateDatasetSummary } from '../services/dataService';
import { Target, Map, Lightbulb, ArrowRight, Loader2, FileSearch, Microscope, Sparkles, RefreshCw, Plus } from 'lucide-react';

interface GoalSettingProps {
  columns: ColumnProfile[];
  data: PatientRecord[];
  initialSuggestedGoals: string[];
  initialAnalysisResult: GoalAnalysisResult | null;
  initialRecAnalyses: Record<number, string>;
  selectedGoal: string;
  onGoalSet: (goal: string, roadmap: RoadmapStep[], recs: Recommendation[], dashboardConfig: ChartConfig[]) => void;
  onStateChange: (suggestions: string[], result: GoalAnalysisResult | null, recAnalyses: Record<number, string>) => void;
  onNext: () => void;
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ 
  columns, 
  data, 
  initialSuggestedGoals,
  initialAnalysisResult,
  initialRecAnalyses,
  selectedGoal: parentSelectedGoal,
  onGoalSet, 
  onStateChange,
  onNext, 
  onAddToReport 
}) => {
  // Local state initialized with props
  const [selectedGoal, setSelectedGoal] = useState<string>(parentSelectedGoal || '');
  const [customGoal, setCustomGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GoalAnalysisResult | null>(initialAnalysisResult);
  
  // Dynamic Suggestions State
  const [suggestedGoals, setSuggestedGoals] = useState<string[]>(initialSuggestedGoals);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Deep Dive State
  const [analyzingRecIndex, setAnalyzingRecIndex] = useState<number | null>(null);
  const [recAnalyses, setRecAnalyses] = useState<Record<number, string>>(initialRecAnalyses);

  // Sync state up to parent whenever local state changes
  useEffect(() => {
    onStateChange(suggestedGoals, result, recAnalyses);
  }, [suggestedGoals, result, recAnalyses, onStateChange]);

  // Initial Fetch for Suggestions (Only if needed)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (initialSuggestedGoals && initialSuggestedGoals.length > 0) return;

      setLoadingSuggestions(true);
      // Brief delay to ensure transition is smooth and summary is ready
      const summary = generateDatasetSummary(data);
      const suggestions = await generateGoalSuggestions(summary);
      setSuggestedGoals(suggestions);
      setLoadingSuggestions(false);
    };

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async () => {
    const goal = customGoal || selectedGoal;
    if (!goal) return;

    setLoading(true);
    setRecAnalyses({}); // Clear previous detailed analyses
    
    // Generate summary context
    const dataSummary = generateDatasetSummary(data);

    const response = await generateGoalRoadmap(goal, columns, dataSummary);
    setResult(response);
    onGoalSet(goal, response.roadmap, response.recommendations, response.dashboardConfig);
    setLoading(false);
  };

  const handleDeepDive = async (index: number, rec: Recommendation) => {
    if (recAnalyses[index]) return; // Already analyzed

    const goal = customGoal || selectedGoal;
    setAnalyzingRecIndex(index);
    
    const dataSummary = generateDatasetSummary(data);
    const analysis = await generateRecommendationAnalysis(goal, rec, dataSummary);
    
    setRecAnalyses(prev => ({...prev, [index]: analysis}));
    setAnalyzingRecIndex(null);
  };

  const handleRefreshSuggestions = async () => {
      setLoadingSuggestions(true);
      const summary = generateDatasetSummary(data);
      const suggestions = await generateGoalSuggestions(summary);
      setSuggestedGoals(suggestions);
      setLoadingSuggestions(false);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex p-3 bg-purple-100 text-purple-600 rounded-full mb-4">
          <Target size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Goal Setting & Analysis</h2>
        <p className="text-slate-500">Define your objective. MedPulse AI will analyze your data and create a tailored roadmap.</p>
      </div>

      {!result ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles size={18} className="text-blue-500"/>
                AI Suggested Business Objectives
            </h3>
            <button onClick={handleRefreshSuggestions} className="text-slate-400 hover:text-blue-500 transition-colors" title="Regenerate suggestions">
                <RefreshCw size={16} className={loadingSuggestions ? "animate-spin" : ""} />
            </button>
          </div>
          
          {loadingSuggestions ? (
             <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3 border-2 border-dashed border-slate-100 rounded-xl mb-6">
                 <Loader2 className="animate-spin text-blue-500" size={24} />
                 <p className="text-sm">Analyzing data to identify key opportunities...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {suggestedGoals.map((goal, idx) => (
                <button
                    key={idx}
                    onClick={() => { setSelectedGoal(goal); setCustomGoal(''); }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                    selectedGoal === goal 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                >
                    <span className="font-medium text-slate-800 text-sm">{goal}</span>
                </button>
                ))}
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Or define a custom goal</label>
            <input
              type="text"
              value={customGoal}
              onChange={(e) => { setCustomGoal(e.target.value); setSelectedGoal(''); }}
              placeholder="e.g., Identify most loyal patient demographic"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={(!selectedGoal && !customGoal) || loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <SparklesIcon />}
            {loading ? 'Analyzing Data...' : 'Analyze & Generate Strategy'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
           {/* AI Analysis Section */}
           <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm relative group">
              <button 
                  onClick={() => onAddToReport({ type: 'goal', title: `Situation Analysis: ${customGoal || selectedGoal}`, content: result.analysis })}
                  className="absolute top-4 right-4 bg-white/50 p-2 rounded-lg hover:bg-white text-slate-500 hover:text-blue-600 transition-colors"
                  title="Add to Report"
              >
                  <Plus size={20} />
              </button>
              <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileSearch className="text-indigo-600" /> AI Data Analysis
              </h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                {result.analysis}
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Roadmap */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit relative">
              <button 
                  onClick={() => onAddToReport({ type: 'goal', title: `Analytical Roadmap: ${customGoal || selectedGoal}`, content: result.roadmap })}
                  className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors"
                  title="Add Roadmap to Report"
              >
                  <Plus size={20} />
              </button>
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Map className="text-blue-500" /> Analytical Roadmap
              </h3>
              <div className="space-y-6">
                {result.roadmap.map((step, idx) => (
                  <div key={idx} className="relative pl-8 border-l-2 border-slate-100 last:border-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                    <div className="mb-1">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Step {step.step}</span>
                      <h4 className="font-semibold text-slate-800">{step.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600">{step.action}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Lightbulb className="text-amber-500" /> AI Recommendations
              </h3>
              <p className="text-sm text-slate-500 mb-2">Click "Analyze" to see why the AI suggests these actions.</p>
              
              {result.recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-lg hover:scale-[1.01] transition-all duration-300"
                >
                  <button 
                      onClick={() => onAddToReport({ 
                        type: 'recommendation', 
                        title: `Rec: ${rec.title}`, 
                        content: `${rec.description} (Impact: ${rec.impact}). ${recAnalyses[idx] || ''}` 
                      })}
                      className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Add to Report"
                  >
                      <Plus size={20} />
                  </button>

                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {rec.category}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      rec.impact === 'High' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.impact} Impact
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg">{rec.title}</h4>
                  <p className="text-sm text-slate-600 mt-1 mb-3">{rec.description}</p>
                  
                  {/* Detailed Analysis Section */}
                  {recAnalyses[idx] ? (
                    <div className="mt-3 pt-3 border-t border-indigo-100 bg-indigo-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl animate-in fade-in slide-in-from-top-1">
                      <h5 className="text-sm font-semibold text-indigo-700 mb-1 flex items-center gap-2">
                        <Sparkles size={14} /> AI Deep Dive
                      </h5>
                      <p className="text-sm text-slate-700 leading-relaxed">{recAnalyses[idx]}</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleDeepDive(idx, rec)}
                      disabled={analyzingRecIndex === idx}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors mt-2"
                    >
                      {analyzingRecIndex === idx ? (
                         <Loader2 className="animate-spin" size={16}/>
                      ) : (
                         <Microscope size={16} />
                      )}
                      {analyzingRecIndex === idx ? 'Generating Deep Dive...' : 'Analyze Impact'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onNext}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              Build Live Dashboard <ArrowRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

export default GoalSetting;