
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import DataQuality from './components/DataQuality';
import Introspection from './components/Introspection';
import GoalSetting from './components/GoalSetting';
import Dashboard from './components/Dashboard';
import ReportGen from './components/ReportGen';
import MultiFileAnalysis from './components/MultiFileAnalysis';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import ModeSelection from './components/ModeSelection';
import { generateQualityReport } from './services/dataService';
import { AppStage, PatientRecord, DataQualityReport, ChartConfig, RoadmapStep, Recommendation, ReportItem, User, ReportHistoryItem, DraftSession, AnalyticalQuestion, GoalAnalysisResult, Dataset } from './types';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // View State (Landing -> Login -> App)
  const [showLanding, setShowLanding] = useState(true);

  // App State
  const [stage, setStage] = useState<AppStage>(AppStage.MODE_SELECTION);
  const [data, setData] = useState<PatientRecord[]>([]);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [dashboardConfig, setDashboardConfig] = useState<ChartConfig[]>([]);

  // Intermediate AI State (Cached to prevent re-generation)
  const [introQuestions, setIntroQuestions] = useState<AnalyticalQuestion[]>([]);
  const [introAnswers, setIntroAnswers] = useState<Record<number, string>>({});
  
  const [goalSuggestions, setGoalSuggestions] = useState<string[]>([]);
  const [goalAnalysisResult, setGoalAnalysisResult] = useState<GoalAnalysisResult | null>(null);
  const [goalRecAnalyses, setGoalRecAnalyses] = useState<Record<number, string>>({});

  // Report Cart State - GLOBAL and PERSISTENT
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  
  // Persistence State
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [drafts, setDrafts] = useState<DraftSession[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Navigation State for ReportGen
  const [historyItemToLoad, setHistoryItemToLoad] = useState<ReportHistoryItem | null>(null);

  // Refs for Auto-save
  const dataRef = useRef(data);
  const qualityReportRef = useRef(qualityReport);
  const stageRef = useRef(stage);
  const selectedGoalRef = useRef(selectedGoal);
  const dashboardConfigRef = useRef(dashboardConfig);
  const reportItemsRef = useRef(reportItems);
  const userRef = useRef(user);
  const draftsRef = useRef(drafts);
  
  // Refs for intermediate state
  const introQuestionsRef = useRef(introQuestions);
  const introAnswersRef = useRef(introAnswers);
  const goalSuggestionsRef = useRef(goalSuggestions);
  const goalAnalysisResultRef = useRef(goalAnalysisResult);
  const goalRecAnalysesRef = useRef(goalRecAnalyses);

  // Sync refs with state
  useEffect(() => {
    dataRef.current = data;
    qualityReportRef.current = qualityReport;
    stageRef.current = stage;
    selectedGoalRef.current = selectedGoal;
    dashboardConfigRef.current = dashboardConfig;
    reportItemsRef.current = reportItems;
    userRef.current = user;
    draftsRef.current = drafts;
    
    introQuestionsRef.current = introQuestions;
    introAnswersRef.current = introAnswers;
    goalSuggestionsRef.current = goalSuggestions;
    goalAnalysisResultRef.current = goalAnalysisResult;
    goalRecAnalysesRef.current = goalRecAnalyses;
  }, [data, qualityReport, stage, selectedGoal, dashboardConfig, reportItems, user, drafts, introQuestions, introAnswers, goalSuggestions, goalAnalysisResult, goalRecAnalyses]);

  // Load user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('vision_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setShowLanding(false); // Skip landing if logged in
    }
  }, []);

  // Load User-Specific History and Drafts when user changes
  useEffect(() => {
    if (user) {
      const historyKey = `vision_history_${user.email}`;
      const draftsKey = `vision_drafts_${user.email}`;
      
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) setReportHistory(JSON.parse(savedHistory));
      else setReportHistory([]);

      const savedDrafts = localStorage.getItem(draftsKey);
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
      else setDrafts([]);
    }
  }, [user]);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('vision_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    // Attempt save, but don't block
    try {
        if (data.length > 0) saveDraft(true);
    } catch(e) { console.warn("Save failed on logout", e); }
    
    setUser(null);
    localStorage.removeItem('vision_user');
    resetState(false); // Clear everything on logout
    setStage(AppStage.MODE_SELECTION);
    setShowLanding(true); // Return to landing page
  };

  // Modified resetState to support Global Cart persistence
  const resetState = (keepCart = true) => {
    setData([]);
    setQualityReport(null);
    setSelectedGoal('');
    setDashboardConfig([]);
    if (!keepCart) setReportItems([]); // Only clear if explicitly requested (e.g. logout)
    setHistoryItemToLoad(null);
    
    // Reset intermediate
    setIntroQuestions([]);
    setIntroAnswers({});
    setGoalSuggestions([]);
    setGoalAnalysisResult(null);
    setGoalRecAnalyses({});
  };

  const handleSwitchMode = () => {
     try {
         if (data.length > 0) saveDraft(true);
     } catch(e) { console.warn("Save failed on switch", e); }
     
     resetState(true); // Keep cart items when switching
     setStage(AppStage.MODE_SELECTION);
  };

  const handleAnalyzeFromMultiFile = (dataset: Dataset) => {
    // 1. Generate quality report for the new dataset
    const report = generateQualityReport(dataset.data);
    
    // 2. Set Data and Report
    setData(dataset.data);
    setQualityReport(report);

    // 3. Reset analysis-specific state to ensure clean slate
    setSelectedGoal('');
    setDashboardConfig([]);
    // Report items preserved via Global Cart
    setIntroQuestions([]);
    setIntroAnswers({});
    setGoalSuggestions([]);
    setGoalAnalysisResult(null);
    setGoalRecAnalyses({});
    setHistoryItemToLoad(null);

    // 4. Switch stage to UPLOAD (which renders DataQuality if data exists)
    setStage(AppStage.UPLOAD);
  };

  // Generalized Save Function
  const saveDraft = useCallback((silent = false) => {
    const currentUser = userRef.current;
    const currentData = dataRef.current;
    const currentReport = qualityReportRef.current;
    const currentStage = stageRef.current;

    // Don't save if in mode selection or multi-analysis (stateless for now)
    if (!currentUser || currentStage === AppStage.MODE_SELECTION || currentStage === AppStage.MULTI_ANALYSIS) return;
    if (currentData.length === 0 || !currentReport) return;

    const newDraft: DraftSession = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      stage: currentStage,
      data: currentData,
      qualityReport: currentReport,
      selectedGoal: selectedGoalRef.current,
      dashboardConfig: dashboardConfigRef.current,
      reportItems: reportItemsRef.current,
      // Save intermediate states
      introspectionQuestions: introQuestionsRef.current,
      introspectionAnswers: introAnswersRef.current,
      goalSuggestions: goalSuggestionsRef.current,
      goalAnalysisResult: goalAnalysisResultRef.current,
      goalRecAnalyses: goalRecAnalysesRef.current
    };

    const currentDrafts = draftsRef.current;
    const updatedDrafts = [newDraft, ...currentDrafts].slice(0, 3); // Keep only last 3 drafts
    
    setDrafts(updatedDrafts);
    localStorage.setItem(`vision_drafts_${currentUser.email}`, JSON.stringify(updatedDrafts));
    setLastSaved(new Date());

  }, []);

  // Manual Handler for Button
  const handleManualSave = () => {
      saveDraft(false);
  };

  // --- Auto-Save & Idle Logic ---
  useEffect(() => {
    if (!user) return;
    if (stage === AppStage.MULTI_ANALYSIS || stage === AppStage.MODE_SELECTION) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      if (data.length > 0) {
        idleTimer = setTimeout(() => {
           console.log("User idle, auto-saving draft...");
           saveDraft(true); 
        }, 60000); 
      }
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    
    const handleBeforeUnload = () => {
        if (dataRef.current.length > 0) {
            saveDraft(true);
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, data.length, saveDraft, stage]);


  const handleNewAnalysis = () => {
      try {
          if (data.length > 0) saveDraft(true);
      } catch(e) { console.warn("Save failed on reset", e); }
      resetState(true); // Keep cart
      setStage(AppStage.UPLOAD); // Default to single file upload restart if in single mode, handled by Layout
  };

  const handleRestoreDraft = (draft: DraftSession) => {
    if (data.length > 0 && !window.confirm("Restore draft? Current unsaved progress will be moved to drafts.")) {
       return;
    }
    
    if (data.length > 0) {
      saveDraft(true);
    }

    setData(draft.data);
    setQualityReport(draft.qualityReport);
    setSelectedGoal(draft.selectedGoal);
    setDashboardConfig(draft.dashboardConfig);
    setReportItems(draft.reportItems);
    setStage(draft.stage);
    
    // Restore intermediate states if they exist
    setIntroQuestions(draft.introspectionQuestions || []);
    setIntroAnswers(draft.introspectionAnswers || {});
    setGoalSuggestions(draft.goalSuggestions || []);
    setGoalAnalysisResult(draft.goalAnalysisResult || null);
    setGoalRecAnalyses(draft.goalRecAnalyses || {});

    setHistoryItemToLoad(null);
  };

  const handleDeleteDraft = (id: string) => {
      if (!user) return;
      const updatedDrafts = drafts.filter(d => d.id !== id);
      setDrafts(updatedDrafts);
      localStorage.setItem(`vision_drafts_${user.email}`, JSON.stringify(updatedDrafts));
  };

  const handleDeleteHistory = (id: string) => {
      if (!user) return;
      const updatedHistory = reportHistory.filter(h => h.id !== id);
      setReportHistory(updatedHistory);
      localStorage.setItem(`vision_history_${user.email}`, JSON.stringify(updatedHistory));
  };

  const handleLoadHistoryFromLayout = (item: ReportHistoryItem) => {
      if (data.length > 0) {
          saveDraft(true);
      }
      setHistoryItemToLoad(item);
      setStage(AppStage.REPORT);
  };

  const handleFinishSession = () => {
    resetState(false); // Clear cart on finish
    setStage(AppStage.MODE_SELECTION);
  };

  const handleDataLoaded = (uploadedData: PatientRecord[], report: DataQualityReport) => {
    setData(uploadedData);
    setQualityReport(report);
  };

  // Handle Updates from DataQuality component (editing/imputation)
  const handleDataUpdate = (newData: PatientRecord[]) => {
      setData(newData);
      const newReport = generateQualityReport(newData);
      setQualityReport(newReport);
  };

  const handleGoalSet = (goal: string, roadmap: RoadmapStep[], recs: Recommendation[], config: ChartConfig[]) => {
    setSelectedGoal(goal);
    setDashboardConfig(config);
  };

  const handleAddToReport = (item: Omit<ReportItem, 'id' | 'timestamp'>) => {
    const newItem: ReportItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setReportItems(prev => [...prev, newItem]);
  };

  const handleSaveToHistory = (report: ReportHistoryItem) => {
      if (!user) return;
      const updatedHistory = [report, ...reportHistory];
      setReportHistory(updatedHistory);
      localStorage.setItem(`vision_history_${user.email}`, JSON.stringify(updatedHistory));
  };

  const handleBack = () => {
      switch(stage) {
          case AppStage.ANALYSIS: setStage(AppStage.UPLOAD); break;
          case AppStage.GOALS: setStage(AppStage.ANALYSIS); break;
          case AppStage.DASHBOARD: setStage(AppStage.GOALS); break;
          case AppStage.REPORT: setStage(AppStage.DASHBOARD); break;
          default: break;
      }
  };

  const renderContent = () => {
    switch (stage) {
      case AppStage.MODE_SELECTION:
        return (
          <ModeSelection 
            onSelectSingle={() => setStage(AppStage.UPLOAD)}
            onSelectMulti={() => setStage(AppStage.MULTI_ANALYSIS)}
          />
        );

      case AppStage.UPLOAD:
        if (qualityReport && data.length > 0) {
          return (
            <DataQuality 
              report={qualityReport} 
              data={data}
              onNext={() => setStage(AppStage.ANALYSIS)} 
              onAddToReport={handleAddToReport}
              onDataUpdate={handleDataUpdate}
            />
          );
        }
        return <FileUpload onDataLoaded={handleDataLoaded} />;
      
      case AppStage.ANALYSIS:
        return (
          <Introspection 
            columns={qualityReport?.columns || []} 
            rowCount={data.length}
            data={data}
            initialQuestions={introQuestions}
            initialAnswers={introAnswers}
            onStateChange={(qs, ans) => {
                setIntroQuestions(qs);
                setIntroAnswers(ans);
            }}
            onNext={() => setStage(AppStage.GOALS)}
            onAddToReport={handleAddToReport}
          />
        );

      case AppStage.GOALS:
        return (
          <GoalSetting 
            columns={qualityReport?.columns || []}
            data={data}
            initialSuggestedGoals={goalSuggestions}
            initialAnalysisResult={goalAnalysisResult}
            initialRecAnalyses={goalRecAnalyses}
            selectedGoal={selectedGoal}
            onGoalSet={handleGoalSet}
            onStateChange={(suggestions, result, analyses) => {
                setGoalSuggestions(suggestions);
                setGoalAnalysisResult(result);
                setGoalRecAnalyses(analyses);
            }}
            onNext={() => setStage(AppStage.DASHBOARD)}
            onAddToReport={handleAddToReport}
          />
        );

      case AppStage.DASHBOARD:
        return (
          <Dashboard 
            data={data} 
            goal={selectedGoal} 
            config={dashboardConfig}
            onAddToReport={handleAddToReport}
          />
        );

      case AppStage.REPORT:
        return (
          <ReportGen 
            items={reportItems}
            onRemoveItem={(id) => setReportItems(prev => prev.filter(i => i.id !== id))}
            history={reportHistory}
            onSaveToHistory={handleSaveToHistory}
            onFinishSession={handleFinishSession}
            externalLoadItem={historyItemToLoad}
          />
        );

      case AppStage.MULTI_ANALYSIS:
        return <MultiFileAnalysis onAnalyzeDataset={handleAnalyzeFromMultiFile} onAddToReport={handleAddToReport} />;

      default:
        return <div>Unknown Stage</div>;
    }
  };

  // --- RENDER LOGIC BASED ON VIEW STATE ---
  
  // 1. Landing Page (Default if not logged in)
  if (!user && showLanding) {
    return <LandingPage onSignIn={() => setShowLanding(false)} />;
  }

  // 2. Login Page
  if (!user && !showLanding) {
    return <Login onLogin={handleLogin} />;
  }

  // 3. Main App Layout (Logged in)
  return (
    <Layout 
      currentStage={stage} 
      cartItemCount={reportItems.length}
      onGoToReport={() => setStage(AppStage.REPORT)}
      onStageChange={(newStage) => {
          if (data.length === 0 && newStage !== AppStage.UPLOAD && newStage !== AppStage.REPORT && newStage !== AppStage.MULTI_ANALYSIS && newStage !== AppStage.MODE_SELECTION) return;
          setStage(newStage);
      }}
      onNewAnalysis={handleNewAnalysis}
      onSaveDraft={handleManualSave}
      lastSaved={lastSaved}
      onLogout={handleLogout}
      user={user}
      drafts={drafts}
      history={reportHistory}
      onRestoreDraft={handleRestoreDraft}
      onLoadHistory={handleLoadHistoryFromLayout}
      onDeleteDraft={handleDeleteDraft}
      onDeleteHistory={handleDeleteHistory}
      onSwitchMode={handleSwitchMode}
      onBack={data.length > 0 && stage !== AppStage.UPLOAD && stage !== AppStage.MULTI_ANALYSIS ? handleBack : undefined}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
