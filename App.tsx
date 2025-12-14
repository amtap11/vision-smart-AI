
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DataStudio from './components/DataStudio';
import SmartAnalysisWrapper from './components/SmartAnalysisWrapper';
import MultiFileAnalysis from './components/MultiFileAnalysis'; // We will reuse the analytics part here for Deep Dive
import ReportGen from './components/ReportGen';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import { generateQualityReport, parseCSV } from './services/dataService';
import { apiClient } from './services/apiClient';
import {
  AppStage, PatientRecord, DataQualityReport, ChartConfig, ReportItem, User,
  Dataset, DraftSession, SmartStage, AnalyticalQuestion, GoalAnalysisResult, ReportHistoryItem
} from './types';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  // --- CORE STATE (Persists across modes) ---
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [reportDraft, setReportDraft] = useState<{ items: ReportItem[], context?: any, title?: string } | null>(null);
  
  // Auto-save state for all modules
  const [smartAnalysisDraft, setSmartAnalysisDraft] = useState<any>(null);
  const [dataStudioDraft, setDataStudioDraft] = useState<any>(null);
  const [deepDiveDraft, setDeepDiveDraft] = useState<any>(null);
  
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

  // Load user and restore all drafts
  useEffect(() => {
    const savedUser = localStorage.getItem('vision_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setShowLanding(false);
      
      // Restore report draft
      const savedReportDraft = localStorage.getItem('vision_report_draft');
      if (savedReportDraft) {
        try {
          const draft = JSON.parse(savedReportDraft);
          setReportDraft(draft);
          if (draft.items && draft.items.length > 0) {
            setReportItems(draft.items);
          }
        } catch (e) {
          console.error('Error loading report draft:', e);
        }
      }
      
      // Restore report history
      const savedReportHistory = localStorage.getItem('vision_report_history');
      if (savedReportHistory) {
        try {
          setReportHistory(JSON.parse(savedReportHistory));
        } catch (e) {
          console.error('Error loading report history:', e);
        }
      }
      
      // Restore datasets
      const savedDatasets = localStorage.getItem('vision_datasets_full');
      if (savedDatasets) {
        try {
          const restored = JSON.parse(savedDatasets);
          setDatasets(restored);
          if (restored.length > 0) {
            const savedActiveId = localStorage.getItem('vision_active_dataset_id');
            if (savedActiveId && restored.find((d: Dataset) => d.id === savedActiveId)) {
              setActiveDatasetId(savedActiveId);
            } else {
              setActiveDatasetId(restored[0].id);
            }
          }
        } catch (e) {
          console.error('Error loading datasets:', e);
        }
      }
      
      // Restore Smart Analysis state
      const savedSmartAnalysis = localStorage.getItem('vision_smart_analysis_draft');
      if (savedSmartAnalysis) {
        try {
          const draft = JSON.parse(savedSmartAnalysis);
          setSmartAnalysisDraft(draft);
          if (draft.introQuestions) setIntroQuestions(draft.introQuestions);
          if (draft.introAnswers) setIntroAnswers(draft.introAnswers);
          if (draft.goalSuggestions) setGoalSuggestions(draft.goalSuggestions);
          if (draft.goalAnalysisResult) setGoalAnalysisResult(draft.goalAnalysisResult);
          if (draft.goalRecAnalyses) setGoalRecAnalyses(draft.goalRecAnalyses);
          if (draft.selectedGoal) setSelectedGoal(draft.selectedGoal);
          if (draft.dashboardConfig) setDashboardConfig(draft.dashboardConfig);
          if (draft.smartStage) setSmartStage(draft.smartStage);
        } catch (e) {
          console.error('Error loading smart analysis draft:', e);
        }
      }
    }
  }, []);
  
  // Auto-save report items whenever they change
  useEffect(() => {
    if (user && reportItems.length >= 0) {
      const draft = {
        items: reportItems,
        context: {},
        title: 'Draft Report',
        savedAt: new Date().toISOString()
      };
      setReportDraft(draft);
      localStorage.setItem('vision_report_draft', JSON.stringify(draft));
    }
  }, [reportItems, user]);
  
  // Auto-save report history
  useEffect(() => {
    if (user && reportHistory.length > 0) {
      localStorage.setItem('vision_report_history', JSON.stringify(reportHistory));
    }
  }, [reportHistory, user]);
  
  // Auto-save datasets
  useEffect(() => {
    if (user && datasets.length > 0) {
      try {
        localStorage.setItem('vision_datasets_full', JSON.stringify(datasets));
        if (activeDatasetId) {
          localStorage.setItem('vision_active_dataset_id', activeDatasetId);
        }
      } catch (e) {
        console.error('Error saving datasets (may be too large):', e);
      }
    }
  }, [datasets, activeDatasetId, user]);
  
  // Auto-save Smart Analysis state
  useEffect(() => {
    if (user) {
      const draft = {
        introQuestions,
        introAnswers,
        goalSuggestions,
        goalAnalysisResult,
        goalRecAnalyses,
        selectedGoal,
        dashboardConfig,
        smartStage,
        savedAt: new Date().toISOString()
      };
      setSmartAnalysisDraft(draft);
      localStorage.setItem('vision_smart_analysis_draft', JSON.stringify(draft));
    }
  }, [introQuestions, introAnswers, goalSuggestions, goalAnalysisResult, goalRecAnalyses, selectedGoal, dashboardConfig, smartStage, user]);

  // --- ACTIONS ---

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('vision_user', JSON.stringify(u));
    setAppStage(AppStage.HUB);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('vision_user');
      setDatasets([]);
      setReportItems([]);
      setShowLanding(true);
    }
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
              setDatasets(prev => {
                const updated = [...prev, ...newDatasets];
                // Auto-save datasets immediately
                if (user) {
                  try {
                    localStorage.setItem('vision_datasets_full', JSON.stringify(updated));
                  } catch (e) {
                    console.error('Error saving datasets:', e);
                  }
                }
                return updated;
              });
              if (!activeDatasetId) setActiveDatasetId(newDatasets[0].id);
          }
      };
      input.click();
  };

  const handleDeleteDataset = (id: string) => {
      setDatasets(prev => {
        const updated = prev.filter(d => d.id !== id);
        // Auto-save after deletion
        if (user) {
          try {
            localStorage.setItem('vision_datasets_full', JSON.stringify(updated));
          } catch (e) {
            console.error('Error saving datasets:', e);
          }
        }
        return updated;
      });
      if (activeDatasetId === id) setActiveDatasetId(null);
  };

  const handleAddToReport = (item: Omit<ReportItem, 'id' | 'timestamp'>) => {
    const newItem: ReportItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    setReportItems(prev => {
      const updated = [...prev, newItem];
      // Auto-save immediately
      if (user) {
        const draft = {
          items: updated,
          context: {},
          title: 'Draft Report',
          savedAt: new Date().toISOString()
        };
        localStorage.setItem('vision_report_draft', JSON.stringify(draft));
        setReportDraft(draft);
      }
      return updated;
    });
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
                      datasets={datasets}
                      onUpdateDatasets={setDatasets}
                      onAddToReport={handleAddToReport} 
                  />
              );

          case AppStage.REPORT:
              return (
                  <ReportGen 
                      items={reportItems}
                      onRemoveItem={(id) => setReportItems(prev => prev.filter(i => i.id !== id))}
                      history={reportHistory} 
                      onSaveToHistory={(item) => setReportHistory(prev => [...prev, item])}
                      onFinishSession={() => {
                        setAppStage(AppStage.HUB);
                        // Don't clear items - keep them for next session (auto-saved)
                        // setReportItems([]);
                        // setReportDraft(null);
                      }}
                      externalLoadItem={null}
                      onHistoryClick={() => {}}
                      onDraftSave={() => {
                        setReportDraft({ items: reportItems, context: {}, title: 'Draft Report' });
                      }}
                      onDraftLoad={() => {
                        if (reportDraft) {
                          setReportItems(reportDraft.items);
                        }
                      }}
                      onReset={() => {
                        if (confirm('Are you sure you want to reset the report? This will clear all items.')) {
                          setReportItems([]);
                          setReportDraft(null);
                        }
                      }}
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
      onHistoryClick={user ? () => {
        if (appStage === AppStage.REPORT) {
          const handler = (window as any).__reportHistoryClick;
          if (handler) handler();
        } else {
          // Navigate to report and show history
          setAppStage(AppStage.REPORT);
          setTimeout(() => {
            const handler = (window as any).__reportHistoryClick;
            if (handler) handler();
          }, 100);
        }
      } : undefined}
      onDraftClick={user ? () => {
        if (appStage === AppStage.REPORT) {
          const saveHandler = (window as any).__reportDraftSave;
          const loadHandler = (window as any).__reportDraftLoad;
          if (reportDraft && loadHandler) {
            loadHandler();
          } else if (saveHandler) {
            saveHandler();
          }
        } else {
          // Navigate to report and load draft
          setAppStage(AppStage.REPORT);
          setTimeout(() => {
            if (reportDraft && reportDraft.items) {
              setReportItems(reportDraft.items);
            }
          }, 100);
        }
      } : undefined}
      onResetClick={user ? () => {
        const moduleName = appStage === AppStage.REPORT ? 'report' : 
                          appStage === AppStage.SMART_ANALYSIS ? 'smart analysis' :
                          appStage === AppStage.DEEP_DIVE ? 'deep dive' : 'data studio';
        if (confirm(`Are you sure you want to reset the ${moduleName}? This will clear all current work.`)) {
          if (appStage === AppStage.REPORT) {
            setReportItems([]);
            setReportDraft(null);
            localStorage.removeItem('vision_report_draft');
          } else if (appStage === AppStage.SMART_ANALYSIS) {
            setSmartAnalysisDraft(null);
            setIntroQuestions([]);
            setIntroAnswers({});
            setGoalSuggestions([]);
            setGoalAnalysisResult(null);
            setGoalRecAnalyses({});
            setSelectedGoal('');
            setDashboardConfig([]);
            setSmartStage(SmartStage.INTROSPECTION);
            localStorage.removeItem('vision_smart_analysis_draft');
          } else if (appStage === AppStage.DEEP_DIVE) {
            setDeepDiveDraft(null);
            localStorage.removeItem('vision_deep_dive_draft');
          } else {
            setDataStudioDraft(null);
            localStorage.removeItem('vision_data_studio_draft');
          }
        }
      } : undefined}
      historyCount={reportHistory.length}
      hasDraft={!!(reportDraft || smartAnalysisDraft || dataStudioDraft || deepDiveDraft || reportItems.length > 0 || datasets.length > 0)}
      reportHistory={reportHistory}
      reportDraft={reportDraft}
      onLoadHistoryItem={(item) => {
        // Navigate to report and load the history item
        setAppStage(AppStage.REPORT);
        setTimeout(() => {
          const handler = (window as any).__reportLoadHistoryItem;
          if (handler) handler(item);
        }, 100);
      }}
      onLoadDraft={() => {
        // Navigate to report and load draft
        setAppStage(AppStage.REPORT);
        setTimeout(() => {
          if (reportDraft && reportDraft.items) {
            setReportItems(reportDraft.items);
          }
        }, 100);
      }}
    >
        {renderContent()}
    </Layout>
  );
};

export default App;
