
import React from 'react';
import { SmartStage, PatientRecord, DataQualityReport, AnalyticalQuestion, GoalAnalysisResult, ChartConfig, RoadmapStep, Recommendation, ReportItem } from '../types';
import Introspection from './Introspection';
import GoalSetting from './GoalSetting';
import Dashboard from './Dashboard';

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

  if (!data.length || !qualityReport) {
    return <div className="text-center py-10 text-slate-400">Please select a valid dataset from the Data Drive.</div>;
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
                      return (
                          <div key={step.id} className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                                  ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : isPast ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-300'}
                              `}>
                                  {idx + 1}
                              </div>
                              <span className={`ml-2 text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-slate-400'}`}>{step.label}</span>
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
                onAddToReport={onAddToReport}
            />
        )}

        {currentStage === SmartStage.DASHBOARD && (
            <Dashboard 
                data={data}
                goal={selectedGoal}
                config={dashboardConfig}
                onAddToReport={onAddToReport}
            />
        )}
    </div>
  );
};

export default SmartAnalysisWrapper;
