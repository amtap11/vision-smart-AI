
import React, { useState } from 'react';
import { SmartStage, PatientRecord, DataQualityReport, AnalyticalQuestion, GoalAnalysisResult, ChartConfig, RoadmapStep, Recommendation, ReportItem } from '../types';
import Introspection from './Introspection';
import GoalSetting from './GoalSetting';
import Dashboard from './Dashboard';
import { Sparkles, PlayCircle, Wand2 } from 'lucide-react';

interface SmartAnalysisWrapperProps {
  currentStage: SmartStage;
  data: PatientRecord[];
  qualityReport: DataQualityReport | null;
  
  // State Props
  introQuestions: AnalyticalQuestion[];
  introAnswers: Record<number, string>;
  goalSuggestions: string[];
  goalAnalysisResult: GoalAnalysisResult | null;
  goalRecAnalyses: Record<number, string>;
  selectedGoal: string;
  dashboardConfig: ChartConfig[];

  // Handlers
  onStageChange: (stage: SmartStage) => void;
  onUpdateState: (key: string, value: any) => void;
  onAddToReport: (item: Omit<ReportItem, 'id' | 'timestamp'>) => void;
}

const SmartAnalysisWrapper: React.FC<SmartAnalysisWrapperProps> = ({
  currentStage,
  data,
  qualityReport,
  introQuestions,
  introAnswers,
  goalSuggestions,
  goalAnalysisResult,
  goalRecAnalyses,
  selectedGoal,
  dashboardConfig,
  onStageChange,
  onUpdateState,
  onAddToReport
}) => {
  // Track if analysis has been started (to prevent auto AI calls)
  const [hasStarted, setHasStarted] = useState(introQuestions.length > 0 || goalSuggestions.length > 0 || selectedGoal.length > 0);

  if (!data.length || !qualityReport) {
    return <div className="text-center py-10 text-slate-400">Please select a valid dataset from the Data Drive.</div>;
  }

  // Show start screen if analysis hasn't been started
  if (!hasStarted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16 px-6">
          <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-6">
            <Wand2 size={48} className="text-indigo-600" />
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">Smart Analysis</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Let AI analyze your data and guide you through a structured workflow to discover insights, set goals, and build actionable dashboards.
          </p>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center justify-center gap-2">
              <Sparkles size={20} className="text-indigo-600" />
              What to Expect
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium text-slate-800">Introspection</p>
                  <p className="text-sm text-slate-600">AI will generate relevant questions about your data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium text-slate-800">Goal Setting</p>
                  <p className="text-sm text-slate-600">Define objectives and get AI-powered recommendations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium text-slate-800">Vision Board</p>
                  <p className="text-sm text-slate-600">Build interactive dashboards with real-time analytics</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setHasStarted(true);
              onStageChange(SmartStage.INTROSPECTION);
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 flex items-center gap-3 mx-auto"
          >
            <PlayCircle size={24} />
            Start Smart Analysis
          </button>
          <p className="text-xs text-slate-400 mt-4">Click to begin AI-powered analysis (uses AI tokens)</p>
        </div>
      </div>
    );
  }

  const renderProgressBar = () => {
      const steps = [
          { id: SmartStage.INTROSPECTION, label: 'Introspection' },
          { id: SmartStage.GOALS, label: 'Goal Setting' },
          { id: SmartStage.DASHBOARD, label: 'Vision Board' }
      ];

      return (
          <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                  {steps.map((step, idx) => {
                      const isActive = step.id === currentStage;
                      const isPast = steps.findIndex(s => s.id === currentStage) > idx;
                      const canNavigate = isPast || isActive; // Allow navigation to past or current step
                      return (
                          <div key={step.id} className="flex items-center">
                              <button
                                  onClick={() => canNavigate && onStageChange(step.id)}
                                  disabled={!canNavigate}
                                  className={`flex items-center group transition-all ${
                                      canNavigate ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                                  }`}
                                  title={canNavigate ? `Go to ${step.label}` : 'Complete previous steps first'}
                              >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                      ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : isPast ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border-slate-200 text-slate-300'}
                                      ${canNavigate && !isActive ? 'hover:scale-110' : ''}
                                  `}>
                                      {idx + 1}
                                  </div>
                                  <span className={`ml-2 text-sm font-medium transition-colors ${
                                      isActive ? 'text-indigo-900 font-bold' : isPast ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-400'
                                  }`}>{step.label}</span>
                              </button>
                              {idx < steps.length - 1 && <div className="w-12 h-px bg-slate-200 ml-4"></div>}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto">
        {renderProgressBar()}
        
        {currentStage === SmartStage.INTROSPECTION && (
            <Introspection 
                columns={qualityReport.columns}
                rowCount={data.length}
                data={data}
                initialQuestions={introQuestions}
                initialAnswers={introAnswers}
                autoGenerate={hasStarted && introQuestions.length === 0}
                onStateChange={(qs, ans) => {
                    onUpdateState('introQuestions', qs);
                    onUpdateState('introAnswers', ans);
                }}
                onNext={() => onStageChange(SmartStage.GOALS)}
                onAddToReport={onAddToReport}
            />
        )}

        {currentStage === SmartStage.GOALS && (
            <GoalSetting 
                columns={qualityReport.columns}
                data={data}
                initialSuggestedGoals={goalSuggestions}
                initialAnalysisResult={goalAnalysisResult}
                initialRecAnalyses={goalRecAnalyses}
                selectedGoal={selectedGoal}
                autoGenerate={hasStarted && goalSuggestions.length === 0}
                onGoalSet={(goal, roadmap, recs, config) => {
                    onUpdateState('selectedGoal', goal);
                    onUpdateState('dashboardConfig', config);
                }}
                onStateChange={(suggs, res, analyses) => {
                    onUpdateState('goalSuggestions', suggs);
                    onUpdateState('goalAnalysisResult', res);
                    onUpdateState('goalRecAnalyses', analyses);
                }}
                onNext={() => onStageChange(SmartStage.DASHBOARD)}
                onBack={() => onStageChange(SmartStage.INTROSPECTION)}
                onAddToReport={onAddToReport}
            />
        )}

        {currentStage === SmartStage.DASHBOARD && (
            <Dashboard 
                data={data}
                goal={selectedGoal}
                config={dashboardConfig}
                onAddToReport={onAddToReport}
                onBack={() => onStageChange(SmartStage.GOALS)}
            />
        )}
    </div>
  );
};

export default SmartAnalysisWrapper;
