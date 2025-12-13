
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DataStudio from './components/DataStudio';
import SmartAnalysisWrapper from './components/SmartAnalysisWrapper';
import MultiFileAnalysis from './components/MultiFileAnalysis'; // We will reuse the analytics part here for Deep Dive
import ReportGen from './components/ReportGen';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { generateQualityReport, parseCSV } from './services/dataService';
import { 
  AppStage, PatientRecord, DataQualityReport, ChartConfig, ReportItem, User, 
  Dataset, DraftSession, SmartStage, AnalyticalQuestion, GoalAnalysisResult 
} from './types';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  // --- CORE STATE (Persists across modes) ---
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  
  // Navigation State
  const [appStage, setAppStage] = useState<AppStage>(AppStage.HUB);
  
  // --- SMART ANALYSIS STATE ---
  const [smartStage, setSmartStage] = useState<SmartStage>(SmartStage.INTROSPECTION);
  const [introQuestions, setIntroQuestions] = useState<AnalyticalQuestion[]>([]);
  const [introAnswers, setIntroAnswers] = useState<Record<number, string>>({});
  const [goalSuggestions, setGoalSuggestions] = useState<string[]>([]);
  const [goalAnalysisResult, setGoalAnalysisResult] = useState<GoalAnalysisResult | null>(null);
  const [goalRecAnalyses, setGoalRecAnalyses] = useState<Record<number, string>>({});
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [dashboardConfig, setDashboardConfig] = useState<ChartConfig[]>([]);

  // Load user
  useEffect(() => {
    const savedUser = localStorage.getItem('vision_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setShowLanding(false);
    }
  }, []);

  // --- ACTIONS ---

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('vision_user', JSON.stringify(u));
    setAppStage(AppStage.HUB);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vision_user');
    setDatasets([]);
    setReportItems([]);
    setShowLanding(true);
  };

  const handleFileUpload = () => {
      // Simulate file click
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.multiple = true;
      input.onchange = async (e: any) => {
          const files = Array.from(e.target.files) as File[];
          if (files.length === 0) return;

          const newDatasets: Dataset[] = [];
          for (const file of files) {
              try {
                  const data = await parseCSV(file);
                  newDatasets.push({
                      id: Math.random().toString(36).substr(2, 9),
                      name: file.name,
                      data: data
                  });
              } catch (err) { console.error(err); }
          }
          
          if (newDatasets.length > 0) {
              setDatasets(prev => [...prev, ...newDatasets]);
              if (!activeDatasetId) setActiveDatasetId(newDatasets[0].id);
          }
      };
      input.click();
  };

  const handleDeleteDataset = (id: string) => {
      setDatasets(prev => prev.filter(d => d.id !== id));
      if (activeDatasetId === id) setActiveDatasetId(null);
  };

  const handleAddToReport = (item: Omit<ReportItem, 'id' | 'timestamp'>) => {
    const newItem: ReportItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setReportItems(prev => [...prev, newItem]);
  };

  // --- RENDER CONTENT ---

  const renderContent = () => {
      switch (appStage) {
          case AppStage.HUB:
              return (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 max-w-2xl">
                          <h2 className="text-3xl font-bold text-slate-800 mb-4">Welcome to Vision Smart AI</h2>
                          <p className="text-slate-500 mb-8">
                              Select a dataset from your drive on the left, then choose a workflow above.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                              <button 
                                onClick={() => setAppStage(AppStage.DATA_STUDIO)}
                                className="p-6 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                              >
                                  <div className="font-bold text-indigo-700 mb-2">Data Studio</div>
                                  <p className="text-xs text-slate-500">Clean, merge, and transform your raw data using AI assistance.</p>
                              </button>
                              <button 
                                onClick={() => setAppStage(AppStage.SMART_ANALYSIS)}
                                className="p-6 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                              >
                                  <div className="font-bold text-purple-700 mb-2">Smart Analysis</div>
                                  <p className="text-xs text-slate-500">Guided flow: Introspection &rarr; Goal Setting &rarr; Vision Board.</p>
                              </button>
                          </div>
                      </div>
                  </div>
              );

          case AppStage.DATA_STUDIO:
              return (
                  <DataStudio 
                      datasets={datasets} 
                      activeDatasetId={activeDatasetId} 
                      onUpdateDatasets={setDatasets}
                      onAnalyzeDataset={(id) => {
                          setActiveDatasetId(id);
                          setAppStage(AppStage.SMART_ANALYSIS);
                      }}
                  />
              );

          case AppStage.SMART_ANALYSIS:
              const activeData = datasets.find(d => d.id === activeDatasetId)?.data || [];
              const qualityReport = activeData.length > 0 ? generateQualityReport(activeData) : null;
              
              return (
                  <SmartAnalysisWrapper 
                      currentStage={smartStage}
                      data={activeData}
                      qualityReport={qualityReport}
                      introQuestions={introQuestions}
                      introAnswers={introAnswers}
                      goalSuggestions={goalSuggestions}
                      goalAnalysisResult={goalAnalysisResult}
                      goalRecAnalyses={goalRecAnalyses}
                      selectedGoal={selectedGoal}
                      dashboardConfig={dashboardConfig}
                      onStageChange={setSmartStage}
                      onUpdateState={(key, val) => {
                          if (key === 'introQuestions') setIntroQuestions(val);
                          if (key === 'introAnswers') setIntroAnswers(val);
                          if (key === 'goalSuggestions') setGoalSuggestions(val);
                          if (key === 'goalAnalysisResult') setGoalAnalysisResult(val);
                          if (key === 'goalRecAnalyses') setGoalRecAnalyses(val);
                          if (key === 'selectedGoal') setSelectedGoal(val);
                          if (key === 'dashboardConfig') setDashboardConfig(val);
                      }}
                      onAddToReport={handleAddToReport}
                  />
              );

          case AppStage.DEEP_DIVE:
              return (
                  <MultiFileAnalysis 
                      onAddToReport={handleAddToReport} 
                  />
              );

          case AppStage.REPORT:
              return (
                  <ReportGen 
                      items={reportItems}
                      onRemoveItem={(id) => setReportItems(prev => prev.filter(i => i.id !== id))}
                      history={[]} 
                      onSaveToHistory={() => {}}
                      onFinishSession={() => setAppStage(AppStage.HUB)}
                      externalLoadItem={null}
                  />
              );
          
          default: return null;
      }
  };

  // --- RENDER ---

  if (!user && showLanding) return <LandingPage onSignIn={() => setShowLanding(false)} />;
  if (!user && !showLanding) return <Login onLogin={handleLogin} />;

  return (
    <Layout 
      currentStage={appStage}
      cartItemCount={reportItems.length}
      onNavigate={setAppStage}
      onLogout={handleLogout}
      user={user}
      datasets={datasets}
      activeDatasetId={activeDatasetId}
      onSetActiveDataset={setActiveDatasetId}
      onDeleteDataset={handleDeleteDataset}
      onUploadClick={handleFileUpload}
    >
        {renderContent()}
    </Layout>
  );
};

export default App;
