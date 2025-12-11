
export interface PatientRecord {
  [key: string]: string | number | boolean | null;
}

export interface Dataset {
  id: string;
  name: string;
  data: PatientRecord[];
  color?: string;
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
  dataKey: string; // The metric column (e.g. 'bill_amount') or 'count'
  xAxisKey?: string; // The dimension column (e.g. 'branch')
  aggregation: 'sum' | 'count' | 'average' | 'none'; // 'none' for scatter/distribution
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
  content: string | object; // The actual data or text to include
  timestamp: Date;
}

export interface ReportHistoryItem {
  id: string;
  date: string;
  title: string;
  htmlContent: string;
  visuals: ReportItem[]; // To reconstruct visuals
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

export enum AppStage {
  MODE_SELECTION = 'MODE_SELECTION',
  UPLOAD = 'DESCRIPTION',
  ANALYSIS = 'INTROSPECTION',
  GOALS = 'GOAL_SETTING',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  MULTI_ANALYSIS = 'MULTI_ANALYSIS'
}

export interface DraftSession {
  id: string;
  timestamp: string;
  stage: AppStage;
  data: PatientRecord[];
  qualityReport: DataQualityReport;
  selectedGoal: string;
  dashboardConfig: ChartConfig[];
  reportItems: ReportItem[];
  // Persisted Intermediate States
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
  type: 'coding' | 'normalization' | 'extraction';
  targetColumn: string;
  action: 'map' | 'uppercase' | 'extract_year' | 'to_numeric';
  parameters?: Record<string, any>; // e.g., mapping object {'Male': 1, 'Female': 0}
}

export interface MergeSuggestion {
  reasoning: string;
  strategy: 'join' | 'union';
  // For Join
  suggestedKeyA?: string;
  suggestedKeyB?: string;
  // For Union
  newColumnName?: string; 
  fileMappings?: { fileName: string, suggestedValue: string }[];
  confidence: 'High' | 'Medium' | 'Low';
}

export interface StatisticalSuggestion {
  datasetIdX: string; // Refers to the dataset ID for the independent variable
  columnX: string;
  datasetIdY: string; // Refers to the dataset ID for the dependent variable
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
  mae: number; // Mean Absolute Error
  predictionData: { actual: number; predicted: number }[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][]; // N x N matrix of correlation coefficients (-1 to 1)
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
  suggestions?: string[]; // Optional quick replies or actions
}
