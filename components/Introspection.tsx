import React, { useEffect, useState } from 'react';
import { ColumnProfile, AnalyticalQuestion, PatientRecord, ReportItem } from '../types';
import { generateIntrospectionQuestions, generateQuestionAnalysis, generateMoreIntrospectionQuestions } from '../services/geminiService';
import { generateDatasetSummary } from '../services/dataService';
import { Sparkles, ArrowRight, Check, X, HelpCircle, Loader2, MessageSquare, Plus, Search, RefreshCw, FileText } from 'lucide-react';

interface IntrospectionProps {
  columns: ColumnProfile[];
  rowCount: number;
  data: PatientRecord[];
  initialQuestions: AnalyticalQuestion[];
  initialAnswers: Record<number, string>;
  onStateChange: (questions: AnalyticalQuestion[], answers: Record<number, string>) => void;
  onNext: () => void;
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

const Introspection: React.FC<IntrospectionProps> = ({ 
  columns, 
  rowCount, 
  data, 
  initialQuestions,
  initialAnswers,
  onStateChange,
  onNext, 
  onAddToReport 
}) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<AnalyticalQuestion[]>(initialQuestions);
  
  // Interaction state
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>(initialAnswers);

  // Manual & Load More state
  const [customQuestionInput, setCustomQuestionInput] = useState("");
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  // Sync state up to parent whenever local state changes
  useEffect(() => {
    onStateChange(questions, answers);
  }, [questions, answers, onStateChange]);

  // Initial Fetch logic (Only if no questions exist)
  useEffect(() => {
    const fetchQuestions = async () => {
      if (initialQuestions && initialQuestions.length > 0) return; // Use existing data
      
      setLoading(true);
      const results = await generateIntrospectionQuestions(columns, rowCount);
      setQuestions(results);
      setLoading(false);
    };

    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeQuestion = async (index: number, question: string) => {
    if (answers[index]) return; // Already answered

    setAnalyzingIndex(index);
    const summary = generateDatasetSummary(data);
    const result = await generateQuestionAnalysis(question, summary);
    
    setAnswers(prev => ({ ...prev, [index]: result }));
    setAnalyzingIndex(null);
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionInput.trim()) return;
    
    const newQ: AnalyticalQuestion = {
        question: customQuestionInput,
        feasibility: 'High', // Assumed until proven otherwise
        requiredColumns: [], // Unknown at this stage
        reasoning: 'Manual user query'
    };
    
    setQuestions(prev => [newQ, ...prev]);
    setCustomQuestionInput("");
  };

  const handleGenerateMore = async () => {
    setIsGeneratingMore(true);
    const existing = questions.map(q => q.question);
    const newQs = await generateMoreIntrospectionQuestions(columns, rowCount, existing);
    
    if (newQs && newQs.length > 0) {
        setQuestions(prev => [...prev, ...newQs]);
    }
    setIsGeneratingMore(false);
  };

  const handleAddToReport = (q: AnalyticalQuestion, idx: number) => {
    onAddToReport({
        type: 'insight',
        title: `Q: ${q.question}`,
        content: answers[idx] ? `AI Insight: ${answers[idx]}` : 'Question identified as relevant but analysis pending.'
    });
  };

  const getFeasibilityColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-semibold text-slate-800">AI Analysis in progress...</h3>
        <p className="text-slate-500 mt-2 max-w-md">Analyzing data structure, identifying patterns and generating business questions (Introspection Phase).</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-500" /> Introspection Phase
          </h2>
          <p className="text-slate-500 mt-1">AI-generated business questions based on your specific data fields.</p>
        </div>
        <button 
          onClick={onNext}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
        >
          Set Goals <ArrowRight size={18} />
        </button>
      </div>

      {/* Manual Question Entry */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Have a specific question in mind?</label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    value={customQuestionInput}
                    onChange={(e) => setCustomQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomQuestion()}
                    placeholder="e.g., Which doctor has the highest return patient rate?"
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>
            <button 
                onClick={handleAddCustomQuestion}
                disabled={!customQuestionInput.trim()}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
            >
                <Plus size={18} /> Add
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getFeasibilityColor(q.feasibility)}`}>
                  {q.feasibility} Feasibility
                </span>
                <button
                    onClick={() => handleAddToReport(q, idx)}
                    className="text-slate-300 hover:text-blue-500 transition-colors"
                    title="Add Question/Insight to Report"
                >
                    <FileText size={20} />
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{q.question}</h3>
              
              <p className="text-slate-600 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {q.reasoning}
              </p>

              <div className="border-t border-slate-100 pt-3 mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Data:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {q.requiredColumns.length > 0 ? q.requiredColumns.map(col => (
                    <span key={col} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                      {columns.find(c => c.name === col) ? <Check size={10} className="text-green-500" /> : <X size={10} className="text-red-500" />}
                      {col}
                    </span>
                  )) : (
                     <span className="text-xs text-slate-400 italic">Determined during analysis</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="mt-2">
              {answers[idx] ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1 mb-2">
                    <Sparkles size={12} /> AI Insight
                  </h4>
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    {answers[idx]}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => handleAnalyzeQuestion(idx, q.question)}
                  disabled={analyzingIndex === idx}
                  className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {analyzingIndex === idx ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-blue-600" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      Ask AI to Answer
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Generate More Button */}
      <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={handleGenerateMore}
            disabled={isGeneratingMore}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-full shadow-sm hover:bg-slate-50 text-slate-700 font-medium transition-all"
          >
              {isGeneratingMore ? <Loader2 size={18} className="animate-spin text-purple-600" /> : <RefreshCw size={18} />}
              {isGeneratingMore ? 'Generating Questions...' : 'Suggest More Questions'}
          </button>
      </div>
    </div>
  );
};

export default Introspection;