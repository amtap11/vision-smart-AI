
export interface PatientRecord {
  [key: string]: string | number | boolean | null;
}

export interface Dataset {
  id: string;
  name: string;
  data: PatientRecord[];
  color?: string;
  qualityScore?: number; // Added for Data Studio
}

export interface ColumnProfile {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  exampleValues: string[];
}

export interface ColumnStatistics {
  name: string;
  type: 'numeric' | 'categorical';
  min?: number;
  max?: number;
  avg?: number;
  topValues?: { value: string; count: number }[];
  uniqueCount: number;
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  columns: ColumnProfile[];
  score: number;
  issues: string[];
}

export interface AnalyticalQuestion {
  question: string;
  feasibility: 'High' | 'Medium' | 'Low';
  requiredColumns: string[];
  reasoning: string;
}

export interface Recommendation {
  category: 'Operational' | 'Financial' | 'Patient Behavior' | 'Strategic';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface RoadmapStep {
  step: number;
  title: string;
  action: string;
}

export interface ChartConfig {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'kpi' | 'scatter' | 'boxplot' | 'map';
  dataKey: string;
  xAxisKey?: string;
  aggregation: 'sum' | 'count' | 'average' | 'none';
  description?: string;
}

export interface GoalAnalysisResult {
  roadmap: RoadmapStep[];
  recommendations: Recommendation[];
  analysis: string;
  dashboardConfig: ChartConfig[];
}

export interface ReportItem {
  id: string;
  type: 'quality' | 'insight' | 'goal' | 'chart' | 'recommendation';
  title: string;
  content: string | object;
  timestamp: Date;
}

export interface ReportHistoryItem {
  id: string;
  date: string;
  title: string;
  htmlContent: string;
  visuals: ReportItem[];
}

export interface ReportReview {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  auditorNote: string;
}

export interface User {
  email: string;
  name: string;
}

// UPDATED STAGES FOR NEW WORKFLOW
export enum AppStage {
  HUB = 'HUB', // The main entry point
  DATA_STUDIO = 'DATA_STUDIO', // The "Kitchen"
  SMART_ANALYSIS = 'SMART_ANALYSIS', // Formerly Simple Mode
  DEEP_DIVE = 'DEEP_DIVE', // Formerly Advanced Mode
  REPORT = 'REPORT', // The Output
  LIVE_DASHBOARD = 'LIVE_DASHBOARD' // New Live Dashboard Mode
}

// Sub-stages for Smart Analysis linear flow
export enum SmartStage {
  INTROSPECTION = 'INTROSPECTION',
  GOALS = 'GOALS',
  DASHBOARD = 'DASHBOARD'
}

export interface DraftSession {
  id: string;
  timestamp: string;
  stage: AppStage;
  // We now save the entire dataset array
  datasets: Dataset[];
  reportItems: ReportItem[];
  // Smart Analysis State
  smartStage?: SmartStage;
  selectedGoal?: string;
  dashboardConfig?: ChartConfig[];
  introspectionQuestions?: AnalyticalQuestion[];
  introspectionAnswers?: Record<number, string>;
  goalSuggestions?: string[];
  goalAnalysisResult?: GoalAnalysisResult | null;
  goalRecAnalyses?: Record<number, string>;
}

export interface TransformationSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'coding' | 'normalization' | 'extraction' | 'calculation';
  targetColumn: string;
  action: 'map' | 'uppercase' | 'extract_year' | 'to_numeric' | 'math';
  parameters?: Record<string, any>;
}

export interface MergeSuggestion {
  reasoning: string;
  strategy: 'join' | 'union';
  suggestedKeyA?: string;
  suggestedKeyB?: string;
  newColumnName?: string;
  fileMappings?: { fileName: string, suggestedValue: string }[];
  confidence: 'High' | 'Medium' | 'Low';
}

export interface StatisticalSuggestion {
  datasetIdX: string;
  columnX: string;
  datasetIdY: string;
  columnY: string;
  type: 'regression' | 'correlation';
  hypothesis: string;
  potentialInsight: string;
}

export interface RegressionModel {
  datasetId: string;
  targetColumn: string;
  featureColumns: string[];
  coefficients: Record<string, number>;
  intercept: number;
  rSquared: number;
  mae: number;
  predictionData: { actual: number; predicted: number }[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
}

export interface ClusterResult {
  k: number;
  clusters: {
    id: number;
    centroid: { x: number; y: number };
    points: { x: number; y: number; label?: string }[];
  }[];
  xAxis: string;
  yAxis: string;
}

export interface ForecastResult {
  historical: { date: string | number; value: number }[];
  forecast: { date: string | number; value: number; lowerBound: number; upperBound: number }[];
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

// --- ML MODEL TYPES ---

export interface DecisionTreeNode {
  feature?: string;
  threshold?: number;
  value?: number | string;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  isLeaf: boolean;
  samples?: number;
  impurity?: number;
}

export interface DecisionTreeResult {
  tree: DecisionTreeNode;
  accuracy: number;
  featureImportance: Record<string, number>;
  predictions: { actual: number | string; predicted: number | string }[];
  isClassification: boolean;
  maxDepth: number;
  numLeaves: number;
}

export interface RandomForestResult {
  trees: DecisionTreeNode[];
  accuracy: number;
  featureImportance: Record<string, number>;
  predictions: { actual: number | string; predicted: number | string }[];
  numTrees: number;
  oobScore: number;
  isClassification: boolean;
}

export interface GradientBoostingStage {
  tree: DecisionTreeNode;
  weight: number;
}

export interface GradientBoostingResult {
  stages: GradientBoostingStage[];
  accuracy: number;
  featureImportance: Record<string, number>;
  predictions: { actual: number | string; predicted: number | string }[];
  learningRate: number;
  numStages: number;
}

// --- SAVED DASHBOARD TYPES ---

export interface DashboardWidgetLayout {
  chartIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SavedDashboard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  datasetId?: string;
  config: ChartConfig[];
  filters?: Record<string, any>;
  layout?: DashboardWidgetLayout[];
  autoRefreshInterval?: number; // in seconds, 0 = disabled
  isTemplate?: boolean;
  requiredColumns?: string[]; // Schema needed for this template
  description?: string; // AI generated description
}
