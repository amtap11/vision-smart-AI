
import { GoogleGenAI, Type } from "@google/genai";
import { AnalyticalQuestion, ColumnProfile, RoadmapStep, Recommendation, GoalAnalysisResult, ChartConfig, ReportItem, ReportReview, Dataset, TransformationSuggestion, MergeSuggestion, StatisticalSuggestion } from "../types";
import { apiClient } from "./apiClient";

// We use 2.5 flash for speed and efficiency in this interactive dashboard
const MODEL_NAME = "gemini-2.5-flash";

// Helper to check if we should use backend API (user is authenticated)
function shouldUseBackendAPI(): boolean {
  return !!apiClient.getToken();
}

// Helper to check if Gemini is available (either through backend or direct)
function isGeminiAvailable(): boolean {
  // If user is authenticated, backend API should be available
  if (shouldUseBackendAPI()) {
    return true;
  }
  // Otherwise, check for frontend API key
  return !!(process.env.API_KEY || process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY);
}

// Helper to get error message when API key is missing
function getApiKeyErrorMessage(): string {
  if (shouldUseBackendAPI()) {
    return 'Gemini API key not configured in backend/.env. Please set GEMINI_API_KEY in backend/.env and restart the backend server.';
  }
  return 'Gemini API key not configured. Please set GEMINI_API_KEY in backend/.env (and ensure you are logged in) or in .env.local for frontend direct calls.';
}

// Helper to convert Type enum schema to plain JSON schema for backend
function convertSchemaToJSON(schema: any): any {
  if (!schema) return schema;
  
  // Convert Type enum values to strings
  const typeMap: Record<number, string> = {
    [Type.STRING]: 'string',
    [Type.NUMBER]: 'number',
    [Type.INTEGER]: 'integer',
    [Type.BOOLEAN]: 'boolean',
    [Type.ARRAY]: 'array',
    [Type.OBJECT]: 'object',
  };

  if (typeof schema === 'object' && schema !== null) {
    const converted: any = Array.isArray(schema) ? [] : {};
    
    for (const key in schema) {
      const value = schema[key];
      
      if (value && typeof value === 'object' && 'type' in value) {
        // Check if type is a Type enum value
        if (typeof value.type === 'number' && typeMap[value.type]) {
          converted[key] = {
            ...value,
            type: typeMap[value.type]
          };
        } else if (value.type === Type.STRING || value.type === 'string') {
          converted[key] = { ...value, type: 'string' };
        } else if (value.type === Type.NUMBER || value.type === 'number') {
          converted[key] = { ...value, type: 'number' };
        } else if (value.type === Type.INTEGER || value.type === 'integer') {
          converted[key] = { ...value, type: 'integer' };
        } else if (value.type === Type.BOOLEAN || value.type === 'boolean') {
          converted[key] = { ...value, type: 'boolean' };
        } else if (value.type === Type.ARRAY || value.type === 'array') {
          converted[key] = {
            ...value,
            type: 'array',
            items: value.items ? convertSchemaToJSON(value.items) : undefined
          };
        } else if (value.type === Type.OBJECT || value.type === 'object') {
          converted[key] = {
            ...value,
            type: 'object',
            properties: value.properties ? convertSchemaToJSON(value.properties) : undefined
          };
        } else {
          converted[key] = convertSchemaToJSON(value);
        }
      } else if (typeof value === 'number' && typeMap[value]) {
        // Direct type enum value
        converted[key] = typeMap[value];
      } else if (Array.isArray(value) || (value && typeof value === 'object')) {
        converted[key] = convertSchemaToJSON(value);
      } else {
        converted[key] = value;
      }
    }
    
    return converted;
  }
  
  return schema;
}

// Helper to call Gemini - prefers backend API when authenticated
async function callGemini(
  prompt: string,
  options?: {
    responseMimeType?: string;
    responseSchema?: any;
    model?: string;
  }
): Promise<string> {
  const model = options?.model || MODEL_NAME;

  // Convert schema if needed (Type enum to plain JSON)
  const jsonSchema = options?.responseSchema ? convertSchemaToJSON(options.responseSchema) : undefined;

  // Try backend API first if user is authenticated
  if (shouldUseBackendAPI()) {
    try {
      console.log('🤖 Calling backend Gemini API...', { 
        hasSchema: !!jsonSchema, 
        hasMimeType: !!options?.responseMimeType,
        model,
        promptLength: prompt.length,
        hasToken: !!apiClient.getToken()
      });
      const response = await apiClient.analyzeWithGemini(prompt, undefined, {
        responseMimeType: options?.responseMimeType,
        responseSchema: jsonSchema,
        model
      });
      console.log('✅ Backend Gemini API success, response length:', response.result?.length || 0);
      return response.result;
    } catch (error: any) {
      console.error('❌ Backend Gemini API failed:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      // Provide detailed error diagnostics
      let diagnosticMessage = `Failed to call Gemini API through backend: ${errorMessage}\n\n`;
      diagnosticMessage += `Diagnostics:\n`;
      diagnosticMessage += `- Backend URL: ${import.meta.env.VITE_API_URL || 'http://localhost:3001'}\n`;
      diagnosticMessage += `- Has Auth Token: ${!!apiClient.getToken()}\n`;
      diagnosticMessage += `- Error Type: ${error?.constructor?.name || 'Unknown'}\n`;
      
      if (errorMessage.includes('503') || errorMessage.includes('not configured')) {
        diagnosticMessage += `\n⚠️  The backend API key is missing or invalid.\n`;
        diagnosticMessage += `Please check that GEMINI_API_KEY is set in backend/.env\n`;
      } else if (errorMessage.includes('Network error') || errorMessage.includes('connect')) {
        diagnosticMessage += `\n⚠️  Cannot connect to backend server.\n`;
        diagnosticMessage += `Please ensure the backend is running on port 3001\n`;
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        diagnosticMessage += `\n⚠️  Authentication failed. Please log in again.\n`;
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        diagnosticMessage += `\n⚠️  Rate limit exceeded. Please wait a moment and try again.\n`;
      }
      
      throw new Error(diagnosticMessage);
    }
  }

  // Fallback: direct call (requires frontend API key)
  console.log('⚠️  Using direct frontend API call (backend not available or user not authenticated)');
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    const errorMsg = 'Gemini API key not configured.\n\n' +
      'Options:\n' +
      '1. Set GEMINI_API_KEY in backend/.env and ensure you are logged in (recommended)\n' +
      '2. Set GEMINI_API_KEY in .env.local for frontend direct calls\n' +
      '3. Set VITE_GEMINI_API_KEY in .env.local for Vite environment';
    throw new Error(errorMsg);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: options?.responseMimeType,
        responseSchema: options?.responseSchema
      }
    });

    console.log('✅ Direct Gemini API call success');
    return response.text || '';
  } catch (error: any) {
    console.error('❌ Direct Gemini API call failed:', error);
    throw new Error(`Direct Gemini API call failed: ${error?.message || 'Unknown error'}. Please check your API key.`);
  }
}

// ... (Previous functions: generateIntrospectionQuestions, generateMoreIntrospectionQuestions, generateGoalSuggestions, generateGoalRoadmap, generateRecommendationAnalysis, generateQuestionAnalysis, generateChartExplanation, generateSingleChartConfig, generateFinalReport, generateChartContextForReport, evaluateReportQuality, analyzeCrossFilePatterns, suggestTransformations, suggestMergeStrategy, suggestStatisticalAnalyses, getModelAdvisorResponse, suggestClusteringSetup, suggestForecastingSetup, explainStatistic, getMockQuestions, getMockRoadmap) ...

export const generateIntrospectionQuestions = async (
  columns: ColumnProfile[], 
  rowCount: number
): Promise<AnalyticalQuestion[]> => {
  if (!isGeminiAvailable()) {
    console.warn("No API Key provided. Returning mock data.");
    console.warn(getApiKeyErrorMessage());
    return getMockQuestions();
  }

  const schemaSummary = columns.map(c => 
    `- ${c.name} (${c.type}): ${c.missingPercentage.toFixed(1)}% missing. Examples: ${c.exampleValues.join(', ')}`
  ).join('\n');

  const prompt = `
    You are an expert Data Analyst capable of analyzing any industry dataset.
    Analyze the following dataset structure (Metadata ONLY).
    Total Rows: ${rowCount}

    Columns:
    ${schemaSummary}

    1. Identify the industry/domain of this data based on column names (e.g., Healthcare, Retail, Finance, Logistics).
    2. Generate 5-8 relevant business questions that can be answered with this specific data.
    Perform a feasibility check for each.
  `;

  try {
    console.log('Generating introspection questions...', { columnCount: columns.length, rowCount });
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            feasibility: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            requiredColumns: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING }
          },
          required: ["question", "feasibility", "requiredColumns", "reasoning"]
        }
      }
    });

    console.log('Received response from Gemini:', responseText?.substring(0, 200));

    if (responseText) {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`Successfully generated ${parsed.length} questions`);
        return parsed as AnalyticalQuestion[];
      } else {
        console.warn('Response is not a valid array:', parsed);
        throw new Error("Invalid response format from AI");
      }
    }
    throw new Error("Empty response from AI");
  } catch (error: any) {
    console.error("Gemini API Error in generateIntrospectionQuestions:", error);
    console.error("Error details:", error?.message, error?.stack);
    // Return mock data on error so the UI doesn't hang
    console.warn("Returning mock questions due to error");
    return getMockQuestions();
  }
};

export const generateMoreIntrospectionQuestions = async (
  columns: ColumnProfile[],
  rowCount: number,
  existingQuestions: string[]
): Promise<AnalyticalQuestion[]> => {
  if (!isGeminiAvailable()) {
    return [
      {
        question: "What is the peak period for activity?",
        feasibility: "High",
        requiredColumns: [columns[0]?.name || "date"],
        reasoning: "Generated specific question."
      }
    ];
  }

  const schemaSummary = columns.map(c => 
    `- ${c.name} (${c.type})`
  ).join('\n');

  const prompt = `
    You are an expert Data Analyst.
    Analyze the following dataset structure (Metadata ONLY).
    Total Rows: ${rowCount}

    Columns:
    ${schemaSummary}

    Existing Questions (DO NOT REPEAT):
    ${existingQuestions.map(q => `- ${q}`).join('\n')}

    Generate 3 NEW, RELEVANT business questions that are different from the existing ones.
    Perform a feasibility check for each.
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            feasibility: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            requiredColumns: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING }
          },
          required: ["question", "feasibility", "requiredColumns", "reasoning"]
        }
      }
    });

    if (responseText) {
      return JSON.parse(responseText) as AnalyticalQuestion[];
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini More Questions Error:", error);
    return [];
  }
};

export const generateGoalSuggestions = async (dataSummary: string): Promise<string[]> => {
  if (!isGeminiAvailable()) {
    return [
      "Increase Overall Efficiency",
      "Maximize Revenue/Output",
      "Reduce Operational Costs",
      "Identify Top Performers"
    ];
  }

  const prompt = `
    You are a Strategic Business Consultant.
    Analyze the following dataset summary. First, detect the industry context (e.g., Sales, HR, Medical).
    Then, suggest 4 specific, high-value business goals for the manager.
    Focus on areas that appear to have issues (e.g. high variance, specific categorical dominance) or opportunities for growth.
    
    Dataset Summary:
    ${dataSummary}

    Output: A JSON array of 4 short, actionable goal strings.
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    });

    if (responseText) {
      return JSON.parse(responseText) as string[];
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini Goal Suggestion Error:", error);
    return [
      "Increase Overall Efficiency",
      "Maximize Revenue/Output",
      "Reduce Operational Costs",
      "Identify Top Performers"
    ];
  }
};

export const generateGoalRoadmap = async (
  goal: string,
  columns: ColumnProfile[],
  dataSummary: string
): Promise<GoalAnalysisResult> => {
  if (!isGeminiAvailable()) {
    console.warn("No API Key. Returning mock roadmap.");
    console.warn(getApiKeyErrorMessage());
    return getMockRoadmap(goal);
  }

  const colDetails = columns.map(c => `- ${c.name} (Type: ${c.type})`).join('\n');
  
  const prompt = `
    The user is a business manager.
    Goal: "${goal}"
    
    Available Data Columns (YOU MUST ONLY USE THESE EXACT NAMES):
    ${colDetails}
    
    Statistical Context:
    ${dataSummary}

    1. Analyze the data summary in the context of the goal. Provide a "Current Situation Analysis" paragraph.
    2. Create a 4-step analytical roadmap.
    3. Provide 3 specific actionable recommendations.
    4. Design a "Live Dashboard" configuration. Suggest 4-6 specific charts or KPIs.
    
    CRITICAL CHART CONFIGURATION RULES:
    - 'dataKey' MUST be an EXACT column name from the list above (case-sensitive), OR use 'count' (lowercase) for counting records.
    - NEVER use 'COUNT' (uppercase) as dataKey. Use 'count' (lowercase) if you want to count records.
    - If 'aggregation' is 'sum' or 'average', 'dataKey' MUST be an EXACT column name that is a 'number' type. Do NOT sum strings.
    - If you want to count records (e.g. number of visits, appointments), use 'count' (lowercase) as 'dataKey' and 'count' as aggregation.
    - 'xAxisKey' MUST be an EXACT column name (usually string or date) for grouping.
    - Use 'map' ONLY if the data contains region/city/location columns.
    - Use 'scatter' ONLY if you have two 'number' columns.
    - For KPI widgets showing totals, use 'count' as dataKey with 'count' aggregation to show total number of records.
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { 
            type: Type.STRING,
            description: "A detailed paragraph analyzing the current situation based on the provided data summary statistics." 
          },
          roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.INTEGER },
                title: { type: Type.STRING },
                action: { type: Type.STRING }
              }
            }
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ["Operational", "Financial", "Strategic"] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
              }
            }
          },
          dashboardConfig: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["bar", "line", "pie", "kpi", "scatter", "boxplot", "map"] },
                dataKey: { type: Type.STRING, description: "Exact column name or 'count'" },
                xAxisKey: { type: Type.STRING, description: "Exact column name for categories" },
                aggregation: { type: Type.STRING, enum: ["sum", "count", "average", "none"] },
                description: { type: Type.STRING }
              },
              required: ["title", "type", "dataKey", "aggregation"]
            }
          }
        },
        required: ["analysis", "roadmap", "recommendations", "dashboardConfig"]
      }
    });

    if (responseText) {
      const result = JSON.parse(responseText) as GoalAnalysisResult;
      
      // Validate and normalize dashboard config
      if (result.dashboardConfig) {
        result.dashboardConfig = result.dashboardConfig.map(config => {
          // Normalize "COUNT" to "count" for dataKey
          if (config.dataKey?.toUpperCase() === 'COUNT') {
            console.warn(`Normalizing dataKey from "COUNT" to "count" for chart: ${config.title}`);
            config.dataKey = 'count';
          }
          // Ensure aggregation matches dataKey
          if (config.dataKey === 'count' && config.aggregation !== 'count') {
            console.warn(`Fixing aggregation to "count" for count-based chart: ${config.title}`);
            config.aggregation = 'count';
          }
          return config;
        });
      }
      
      console.log('Generated dashboard config:', result.dashboardConfig?.length || 0, 'charts');
      return result;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error in generateGoalRoadmap:", error);
    console.error("Error details:", error?.message, error?.stack);
    return getMockRoadmap(goal);
  }
};

export const generateRecommendationAnalysis = async (
  goal: string,
  recommendation: Recommendation,
  dataSummary: string
): Promise<string> => {
  if (!isGeminiAvailable()) {
     return "Detailed analysis requires a valid API key. (Mock: This recommendation is crucial because it directly targets inefficiencies...)";
  }

  const prompt = `
    Role: Senior Data Consultant
    Goal: "${goal}"
    
    Data Summary:
    ${dataSummary}
    
    Target Recommendation:
    - Title: ${recommendation.title}
    - Category: ${recommendation.category}
    - Description: ${recommendation.description}
    - Impact: ${recommendation.impact}

    Provide a "Deep Dive Analysis" for this specific recommendation.
    Focus on:
    1. Evidence: Why this is relevant based on the data summary provided.
    2. Implementation: A concrete step to execute this.
    3. ROI: Why this is a ${recommendation.impact} impact action.
    
    Keep it concise (under 100 words). Do not use markdown headers, just text.
  `;

  try {
    const responseText = await callGemini(prompt);
    return responseText || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Unable to generate detailed analysis at this time.";
  }
};

export const generateQuestionAnalysis = async (
  question: string,
  dataSummary: string
): Promise<string> => {
  if (!isGeminiAvailable()) {
    return "The system requires a live API key to answer specific data questions.";
  }

  const prompt = `
    Role: Data Analyst
    Question: "${question}"
    
    Dataset Statistical Summary:
    ${dataSummary}

    Task: Provide a direct answer or a strong hypothesis based *strictly* on the provided statistical summary.
    If the summary contains the exact answer (e.g. top values), state it clearly.
    If the summary only gives hints (e.g. averages), provide a data-backed hypothesis.
    
    Keep the answer concise (under 3 sentences).
  `;

  try {
    const responseText = await callGemini(prompt);
    return responseText || "Could not generate an answer.";
  } catch (error) {
    console.error("Gemini Question Analysis Error:", error);
    return "Error analyzing question.";
  }
};

export const generateChartExplanation = async (
  goal: string,
  chart: ChartConfig,
  dataSummary: string
): Promise<string> => {
  if (!isGeminiAvailable()) {
    return "This metric helps track progress towards your goal by aggregating key data points.";
  }

  const prompt = `
    Role: Senior Data Analyst
    User Goal: "${goal}"
    
    Metric Configuration:
    - Title: ${chart.title}
    - Type: ${chart.type}
    - Data: ${chart.aggregation} of ${chart.dataKey} ${chart.xAxisKey ? `grouped by ${chart.xAxisKey}` : ''}
    
    Dataset Context:
    ${dataSummary}

    Explain this metric to the user. Cover:
    1. What it represents.
    2. How it is calculated.
    3. Why it is crucial for achieving the goal "${goal}".
    
    Keep the explanation conversational, clear, and under 80 words.
  `;

  try {
    const responseText = await callGemini(prompt);
    return responseText || "No explanation generated.";
  } catch (error) {
    console.error("Gemini Metric Explanation Error:", error);
    return "Unable to generate explanation at this time.";
  }
};

export const generateSingleChartConfig = async (
  goal: string,
  userRequest: string,
  dataSummary: string,
  columnNames: string[]
): Promise<ChartConfig> => {
  if (!isGeminiAvailable()) {
    // Mock response
    return {
       title: "Custom Analysis",
       type: "bar",
       dataKey: columnNames[0] || "count",
       aggregation: "count",
       xAxisKey: columnNames[1] || "category",
       description: "Mock generated chart."
    };
  }

  const prompt = `
    Role: Data Visualization Expert
    User Goal: "${goal}"
    
    Available Columns: ${columnNames.join(', ')}
    Dataset Summary: ${dataSummary}

    User Request: "${userRequest}"

    Task: Generate a single JSON ChartConfig object that best visualizes the user's request.
    - Type must be one of: 'bar', 'line', 'pie', 'kpi', 'scatter', 'boxplot', 'map'.
    - 'dataKey' MUST be an EXACT column name from the list provided (case-sensitive), or 'count' (lowercase) for counting records.
    - NEVER use 'COUNT' (uppercase) as dataKey. Always use 'count' (lowercase) if counting records.
    - 'xAxisKey' MUST be an EXACT column name from the list provided (case-sensitive).
    - Do NOT invent column names. Use only the exact names provided.
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["bar", "line", "pie", "kpi", "scatter", "boxplot", "map"] },
          dataKey: { type: Type.STRING },
          xAxisKey: { type: Type.STRING },
          aggregation: { type: Type.STRING, enum: ["sum", "count", "average", "none"] },
          description: { type: Type.STRING }
        },
        required: ["title", "type", "dataKey", "aggregation"]
      }
    });

    if (responseText) {
      const config = JSON.parse(responseText) as ChartConfig;
      
      // Validate and normalize config
      if (config.dataKey?.toUpperCase() === 'COUNT') {
        console.warn(`Normalizing dataKey from "COUNT" to "count" for chart: ${config.title}`);
        config.dataKey = 'count';
      }
      if (config.dataKey === 'count' && config.aggregation !== 'count') {
        console.warn(`Fixing aggregation to "count" for count-based chart: ${config.title}`);
        config.aggregation = 'count';
      }
      
      console.log('Generated chart config:', config.title, config.type, config.dataKey, config.aggregation);
      return config;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
     console.error("Gemini Single Chart Error:", error);
     console.error("Error details:", error?.message, error?.stack);
     throw error;
  }
};

export const generateFinalReport = async (
  items: ReportItem[],
  context: { audience: string; tone: string; notes: string }
): Promise<string> => {
  if (!isGeminiAvailable()) {
    return "# Mock Report\n\n**Executive Summary**\nThis is a mock report generated because the API key is missing.\n\n**Included Items:**\n" + items.map(i => `- ${i.title}`).join('\n');
  }

  const itemsContent = items.map((item, index) => {
    let contentStr = '';
    if (typeof item.content === 'object') {
      contentStr = JSON.stringify(item.content, null, 2);
    } else {
      contentStr = String(item.content);
    }
    return `ITEM ${index + 1} [Type: ${item.type}]: ${item.title}\nContent: ${contentStr}\n-------------------`;
  }).join('\n\n');

  const prompt = `
    Role: Executive Business Consultant
    Task: Write a comprehensive, professional business report based on the user's selected analysis items.
    
    User Context:
    - Target Audience: ${context.audience}
    - Desired Tone: ${context.tone}
    - Specific Notes: ${context.notes}

    Selected Analysis Items (Data & Insights):
    ${itemsContent}

    Report Structure:
    1. Executive Summary (Synthesize the key findings).
    2. Detailed Data Analysis (Group the provided items logically).
    3. Strategic Recommendations (Based on the recommendations provided).
    4. Conclusion & Next Steps.

    Format:
    - Use standard Markdown.
    - Use bold headings and bullet points.
    - Be professional, data-driven, and persuasive.
    - Do NOT mention "Item 1", "Item 2" explicitly. Weave them into a narrative.
    - DO NOT include placeholders for charts like "[Insert Chart Here]". The system will append charts automatically. Just refer to the data trends in text.
  `;

  try {
    const responseText = await callGemini(prompt);
    return responseText || "Report generation returned empty.";
  } catch (error) {
    console.error("Gemini Report Generation Error:", error);
    return "Failed to generate report due to an error.";
  }
};

// --- NEW FUNCTIONS FOR AGENTIC BEHAVIOR ---

export const suggestRelevantChart = async (
  reportContext: string,
  charts: { id: string, title: string, type: string }[]
): Promise<{ chartId: string, reasoning: string } | null> => {
  if (!isGeminiAvailable()) return null;

  const chartsList = charts.map(c => `- ID: ${c.id}, Title: "${c.title}", Type: ${c.type}`).join('\n');

  const prompt = `
    Role: Editor Assistant
    Task: Suggest the most relevant chart to insert into the report based on the current text context.
    
    Report Text Context (The cursor is implicitly at the end of this text):
    "${reportContext.substring(Math.max(0, reportContext.length - 1500))}"

    Available Charts:
    ${chartsList}

    Rules:
    1. Analyze the last few sentences of the report context.
    2. Identify if any of the available charts provide data that supports, illustrates, or contradicts the text.
    3. Select the SINGLE best chart.
    4. If no chart is clearly relevant to the immediate text, return null.
    
    Output JSON:
    {
      "chartId": "id_of_best_match_or_null",
      "reasoning": "A short, 1-sentence explanation of why this chart fits here."
    }
  `;
  
  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartId: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        },
        required: ["chartId", "reasoning"]
      }
    });

    if (responseText) {
      const result = JSON.parse(responseText);
      if (result.chartId && result.chartId !== "null") {
          return result;
      }
    }
    return null;
  } catch (error) {
    console.error("Suggest Chart Error:", error);
    return null;
  }
};

export const generateChartContextForReport = async (
  chartConfig: ChartConfig,
  dataSample: any[]
): Promise<string> => {
  if (!isGeminiAvailable()) return `AI Analysis: This chart visualizes ${chartConfig.title}.`;

  const prompt = `
    Role: Business Analyst Editor
    Task: Write a short, insightful paragraph (30-50 words) to accompany a chart in a formal report.
    
    Chart Info:
    - Title: ${chartConfig.title}
    - Metric: ${chartConfig.aggregation} of ${chartConfig.dataKey}
    
    Data Top 3 Items (for context): 
    ${JSON.stringify(dataSample.slice(0, 3))}

    Output: A single paragraph interpreting the chart's key takeaway for an executive reader. Do not start with "This chart shows". Jump straight to the insight.
  `;

  try {
    const responseText = await callGemini(prompt);
    return responseText || "Analysis pending.";
  } catch (error) {
    return "Analysis unavailable.";
  }
};

export const evaluateReportQuality = async (
  reportHtmlText: string
): Promise<ReportReview> => {
  if (!isGeminiAvailable()) {
    return {
        score: 85,
        strengths: ["Clear structure", "Good visual usage"],
        weaknesses: ["Mock data used"],
        suggestions: ["Add valid API key"],
        auditorNote: "This is a simulated review."
    };
  }

  const prompt = `
    Role: Lead Quality Assurance Auditor
    Task: Review the following business report content and provide a strict quality assessment.
    
    Report Content (HTML/Text):
    ${reportHtmlText.substring(0, 15000)} (Truncated for limits)

    Evaluate based on:
    1. Clarity & Flow
    2. Data-Driven Evidence
    3. Actionability of Recommendations
    4. Professional Tone

    Output JSON schema:
    {
      "score": number (0-100),
      "strengths": string[] (3 points),
      "weaknesses": string[] (3 points),
      "suggestions": string[] (3 actionable edits),
      "auditorNote": string (Short summary from you, the "Other Model")
    }
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          auditorNote: { type: Type.STRING }
        },
        required: ["score", "strengths", "weaknesses", "suggestions", "auditorNote"]
      }
    });

    if (responseText) {
        return JSON.parse(responseText) as ReportReview;
    }
    throw new Error("Empty review");
  } catch (error) {
    console.error("QA Review Error", error);
    return {
        score: 0,
        strengths: [],
        weaknesses: ["Analysis failed"],
        suggestions: ["Try again"],
        auditorNote: "System error during QA."
    };
  }
};

export const analyzeCrossFilePatterns = async (
    fileSummaries: { name: string, summary: string }[]
): Promise<string> => {
    if (!isGeminiAvailable()) {
        return "Cross-file analysis requires a valid API Key. (Mock: Detected patterns between Sales and Marketing datasets...)";
    }

    const context = fileSummaries.map(f => `FILE: ${f.name}\n${f.summary}`).join('\n\n----------------\n\n');

    const prompt = `
        Role: Advanced Data Detective
        Task: Analyze the summaries of multiple datasets from the SAME company to find correlations, patterns, and causal relationships.

        Datasets:
        ${context}

        Look for:
        1. Shared Keys (e.g. Do they share Patient IDs, Dates, or Branches?)
        2. Correlations (e.g. Does Revenue in File A seem linked to Staffing in File B?)
        3. Missing Links (e.g. Data exists in A but not B).
        4. Hypotheses for Regression Analysis (e.g. "We could predict X from File A using Y from File B").

        Output Format:
        A concise, markdown-formatted report with 3-5 bullet points of "Cross-File Insights".
    `;

    try {
        const responseText = await callGemini(prompt);
        return responseText || "No insights found.";
    } catch (error) {
        console.error("Cross-File AI Error", error);
        return "Failed to generate cross-file insights.";
    }
};

// --- DATA TRANSFORMATION AI SERVICES ---

export const suggestTransformations = async (
  dataSummary: string,
  columns: string[]
): Promise<TransformationSuggestion[]> => {
  if (!isGeminiAvailable()) return [];

  const prompt = `
    Role: Data Engineer
    Task: Suggest 3 useful data transformations to clean or encode this dataset for analysis.
    Focus on:
    1. Coding/Decoding: Converting categorical text (e.g., 'Male'/'Female') to numbers (1/0) or one-hot encoding.
    2. Normalization: Cleaning messy strings.
    3. Extraction: Getting years from dates.

    Data Summary:
    ${dataSummary}
    
    Columns: ${columns.join(', ')}

    Output JSON Format:
    [
      {
        "id": "trans_1",
        "title": "Encode Gender",
        "description": "Convert Male/Female to 0/1 for regression analysis",
        "type": "coding",
        "targetColumn": "Gender",
        "action": "map",
        "parameters": { "Male": 1, "Female": 0 }
      }
    ]
  `;

  try {
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json"
    });

    if (responseText) return JSON.parse(responseText) as TransformationSuggestion[];
    throw new Error("Empty response");
  } catch (error) {
      console.error("Transform Suggestion Error", error);
      return [];
  }
};

export const interpretCustomTransformation = async (
    userPrompt: string,
    columns: string[]
): Promise<TransformationSuggestion | null> => {
    if (!isGeminiAvailable()) return null;

    const prompt = `
        Role: Data Logic Translator
        Task: Convert the user's natural language data transformation request into a structured JSON configuration.
        
        Available Columns: ${columns.join(', ')}
        User Request: "${userPrompt}"

        Instructions:
        1. If the user wants to calculate a new field (e.g. "BMI = Weight / Height^2"), use type 'calculation' and action 'math'.
           - For 'math' action, the 'expression' parameter MUST use 'row["ColumnName"]' syntax. Example: 'row["Weight"] / (row["Height"] * row["Height"])'.
        2. If the user wants to extract part of a string or date, map to existing actions ('extract_year', etc) if possible, or use 'math' with JS string methods if complex.
        3. 'targetColumn' should be the column to modify or create. If creating new, infer a good name.

        Output JSON:
        {
            "id": "custom_1",
            "title": "Short descriptive title",
            "description": "What this does",
            "type": "calculation",
            "targetColumn": "NewColName",
            "action": "math",
            "parameters": { "expression": "row['ColA'] + row['ColB']" }
        }
    `;

    try {
        const responseText = await callGemini(prompt, {
          responseMimeType: "application/json"
        });
        
        if (responseText) return JSON.parse(responseText);
        return null;
    } catch (error) {
        console.error("Custom Transform Error", error);
        return null;
    }
};

export const suggestMergeStrategy = async (
    files: { fileName: string, schema: string }[]
): Promise<MergeSuggestion> => {
    if (!isGeminiAvailable()) return {
        reasoning: "API Key Missing",
        strategy: 'join',
        confidence: "Low"
    };

    const filesContext = files.map(f => `File: ${f.fileName}\nSchema: ${f.schema}`).join('\n\n');

    const prompt = `
        Role: Data Architect
        Task: Analyze these file schemas and suggest the best strategy to MERGE them.
        
        Files:
        ${filesContext}

        Rules:
        1. If schemas are identical or very similar (differ only by case or 1-2 columns), suggest "union" (stacking).
        2. If schemas are different but share a key, suggest "join".
        3. If "union", you MUST suggest a new column to differentiate the data (e.g. if files are "jan_sales.csv", "feb_sales.csv", suggest new column "Month" with values "Jan", "Feb").

        Output JSON Schema:
        {
            "reasoning": "Reason for strategy",
            "strategy": "join" | "union",
            "suggestedKeyA": "key_for_join_if_needed",
            "suggestedKeyB": "key_for_join_if_needed",
            "newColumnName": "source_column_name_for_union",
            "fileMappings": [ { "fileName": "name_of_file_1", "suggestedValue": "value_for_new_column" } ],
            "confidence": "High" | "Medium" | "Low"
        }
    `;

    try {
        const responseText = await callGemini(prompt, {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reasoning: { type: Type.STRING },
              strategy: { type: Type.STRING, enum: ["join", "union"] },
              suggestedKeyA: { type: Type.STRING },
              suggestedKeyB: { type: Type.STRING },
              newColumnName: { type: Type.STRING },
              fileMappings: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING },
                    suggestedValue: { type: Type.STRING }
                  }
                }
              },
              confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["reasoning", "strategy", "confidence"]
          }
        });

        if (responseText) return JSON.parse(responseText) as MergeSuggestion;
        throw new Error("Empty response");
    } catch (error) {
        console.error("Merge Suggestion Error", error);
        return {
            reasoning: "AI Error",
            strategy: 'join',
            confidence: "Low"
        };
    }
};

export const suggestStatisticalAnalyses = async (
  datasetsSummary: { id: string, name: string, columns: string[] }[]
): Promise<StatisticalSuggestion[]> => {
  if (!isGeminiAvailable()) return [];

  const context = datasetsSummary.map(d => `Dataset ID: ${d.id}, Name: ${d.name}, Numeric Columns: ${d.columns.join(', ')}`).join('\n');

  const prompt = `
    Role: Data Scientist
    Task: Identify potential predictive relationships (Regression) or strong associations (Correlation) between numeric variables in the provided datasets.
    
    Datasets Available:
    ${context}

    Instructions:
    1. Look for logical pairs. e.g. "Ad Spend" (X) might predict "Revenue" (Y). "Age" (X) might correlate with "Risk Score" (Y).
    2. Suggest regressions where there is a clear independent (X) and dependent (Y) variable.
    3. Suggest correlations where relationship direction is ambiguous or mutual.
    4. You can suggest pairs within the same dataset OR across different datasets.

    Output JSON Schema:
    [
      {
        "datasetIdX": "id_of_dataset_containing_x",
        "columnX": "name_of_column_x",
        "datasetIdY": "id_of_dataset_containing_y",
        "columnY": "name_of_column_y",
        "type": "regression" | "correlation",
        "hypothesis": "Why these might be related",
        "potentialInsight": "What we might learn"
      }
    ]
  `;

  try {
     const responseText = await callGemini(prompt, {
       responseMimeType: "application/json",
       responseSchema: {
         type: Type.ARRAY,
         items: {
           type: Type.OBJECT,
           properties: {
             datasetIdX: { type: Type.STRING },
             columnX: { type: Type.STRING },
             datasetIdY: { type: Type.STRING },
             columnY: { type: Type.STRING },
             type: { type: Type.STRING, enum: ["regression", "correlation"] },
             hypothesis: { type: Type.STRING },
             potentialInsight: { type: Type.STRING }
           },
           required: ["datasetIdX", "columnX", "datasetIdY", "columnY", "type", "hypothesis"]
         }
       }
     });

     if (responseText) return JSON.parse(responseText) as StatisticalSuggestion[];
     throw new Error("Empty response");
  } catch (error) {
     console.error("Statistical Suggestion Error", error);
     return [];
  }
};

// --- NEW ADVISOR & MODELING SUGGESTION FUNCTIONS ---

export const getModelAdvisorResponse = async (
    userMessage: string,
    context: { 
        currentTool: string; 
        datasets: { id: string, name: string, columns: string[] }[]; 
        lastResult?: any 
    }
): Promise<{ text: string, action?: { type: string, payload: any } }> => {
    if (!isGeminiAvailable()) return { text: "I can help you optimize your model. (API Key required for real advice)" };

    const dsContext = context.datasets.map(d => `ID: "${d.id}", Name: "${d.name}", Cols: [${d.columns.join(', ')}]`).join('\n');

    const prompt = `
        You are an expert Data Science Agent controlling a dashboard.
        
        Context:
        - Current Tool: ${context.currentTool}
        - Datasets Available:
        ${dsContext}
        - Last Analysis Result: ${context.lastResult ? JSON.stringify(context.lastResult).substring(0, 500) : "None yet"}

        User Question: "${userMessage}"

        Task: 
        1. Answer the user's question or acknowledge their command.
        2. If the user asks to perform an action (e.g., "Switch to clustering", "Cluster by Age and Income", "Run it"), return an ACTION JSON.

        Available Actions (return as 'action' field in JSON):
        - SET_MODE: { type: 'SET_MODE', payload: 'regression' | 'clustering' | 'correlation' | 'forecast' }
        - CONFIG_CLUSTERING: { type: 'CONFIG_CLUSTERING', payload: { dsId: string, x: string, y: string, k: number } }
        - CONFIG_FORECAST: { type: 'CONFIG_FORECAST', payload: { dsId: string, dateCol: string, valueCol: string } }
        - CONFIG_REGRESSION: { type: 'CONFIG_REGRESSION', payload: { targetDsId: string, targetCol: string, features: { datasetId: string, col: string }[] } }
        - RUN_ANALYSIS: { type: 'RUN_ANALYSIS', payload: {} }

        Rules:
        - Use dataset IDs from context, not names.
        - If the user asks for "Regression", switch mode first if not already in regression.
        - If the user says "Run", trigger RUN_ANALYSIS.

        Output JSON format:
        {
            "text": "Your conversational response here.",
            "action": { "type": "ACTION_NAME", "payload": { ... } } // Optional
        }
    `;

    try {
        const responseText = await callGemini(prompt, {
          responseMimeType: "application/json"
        });
        
        if (responseText) return JSON.parse(responseText);
        return { text: "I couldn't process that command." };
    } catch (error) {
        console.error("Advisor Error", error);
        return { text: "I'm having trouble analyzing your request right now." };
    }
};

export const suggestClusteringSetup = async (
    datasetSummary: string,
    numericColumns: string[]
): Promise<{ x: string, y: string, k: number, reasoning: string }> => {
    if (!isGeminiAvailable()) return { x: numericColumns[0], y: numericColumns[1], k: 3, reasoning: "Mock suggestion" };

    const prompt = `
        Role: Unsupervised Learning Expert
        Task: Suggest the best 2 variables for K-Means clustering visualization and an optimal K value.
        
        Dataset:
        ${datasetSummary}
        
        Numeric Columns Available: ${numericColumns.join(', ')}

        Output JSON:
        {
            "x": "column_name_1",
            "y": "column_name_2",
            "k": number (2-6),
            "reasoning": "Short explanation why these dimensions show interesting groups"
        }
    `;

    try {
        const responseText = await callGemini(prompt, {
          responseMimeType: "application/json"
        });
        if (responseText) return JSON.parse(responseText);
        throw new Error("Empty");
    } catch (e) {
        return { x: numericColumns[0], y: numericColumns[1], k: 3, reasoning: "Defaulting due to error" };
    }
};

export const suggestForecastingSetup = async (
    datasetSummary: string,
    dateColumns: string[],
    numericColumns: string[]
): Promise<{ dateCol: string, valueCol: string, reasoning: string }> => {
    if (!isGeminiAvailable()) return { dateCol: dateColumns[0], valueCol: numericColumns[0], reasoning: "Mock suggestion" };

    const prompt = `
        Role: Time Series Expert
        Task: Identify the best Date column and Value column to forecast trends.
        
        Dataset:
        ${datasetSummary}
        
        Date Columns: ${dateColumns.join(', ')}
        Numeric Columns: ${numericColumns.join(', ')}

        Output JSON:
        {
            "dateCol": "column_name",
            "valueCol": "column_name",
            "reasoning": "Why this metric is important to forecast"
        }
    `;

    try {
        const responseText = await callGemini(prompt, {
          responseMimeType: "application/json"
        });
        if (responseText) return JSON.parse(responseText);
        throw new Error("Empty");
    } catch (e) {
        return { dateCol: dateColumns[0], valueCol: numericColumns[0], reasoning: "Defaulting due to error" };
    }
};

export const explainStatistic = async (
    type: 'regression' | 'clustering' | 'correlation' | 'forecast',
    dataContext: any
): Promise<string> => {
    if (!isGeminiAvailable()) {
        // Return type-specific fallback messages
        if (type === 'correlation') {
            return "This correlation heatmap shows relationships between variables. Blue squares indicate positive correlations, red indicates negative correlations. Values closer to 1 or -1 show stronger relationships.";
        } else if (type === 'clustering') {
            return "This clustering analysis groups similar data points together. Each cluster represents a distinct segment with similar characteristics.";
        } else if (type === 'regression') {
            return "This regression model predicts one variable based on others. R-Squared shows how well the model fits the data.";
        } else {
            return "This forecast predicts future values based on historical trends.";
        }
    }

    let typeSpecificGuidance = '';
    if (type === 'correlation') {
        typeSpecificGuidance = `
        IMPORTANT: This is a CORRELATION HEATMAP analysis, NOT clustering.
        Focus on:
        - Correlation coefficients (ranging from -1 to +1)
        - Strong positive correlations (close to +1, shown in blue)
        - Strong negative correlations (close to -1, shown in red)
        - Weak correlations (close to 0, shown in white/light colors)
        - What relationships exist between variables
        - Which variables move together or in opposite directions
        `;
    } else if (type === 'clustering') {
        typeSpecificGuidance = `
        This is a CLUSTERING (K-Means) analysis.
        Focus on:
        - Number of clusters identified
        - Cluster centers and characteristics
        - How data points are grouped
        - Similarities within clusters
        `;
    } else if (type === 'regression') {
        typeSpecificGuidance = `
        This is a REGRESSION analysis.
        Focus on:
        - R-Squared value (model fit)
        - Mean Absolute Error (prediction accuracy)
        - How well the model predicts the target variable
        `;
    } else {
        typeSpecificGuidance = `
        This is a FORECASTING (Time-Series) analysis.
        Focus on:
        - Future predictions
        - Trends and patterns
        - Time-based patterns
        `;
    }

    const prompt = `
        Role: Expert Data Scientist
        Task: Explain a ${type} analysis result to a business user. Keep it simple but accurate.
        
        Analysis Type: ${type}
        ${typeSpecificGuidance}
        
        Result Data:
        ${JSON.stringify(dataContext).substring(0, 1000)}

        Explanation Requirements:
        1. What does this ${type} result mean? (Be specific to ${type} analysis)
        2. Key metrics or findings from the data
        3. One actionable takeaway.

        Output: A single paragraph (max 60 words). Make sure you explain ${type} analysis, NOT other analysis types.
    `;

    try {
        const responseText = await callGemini(prompt);
        return responseText || "Analysis unavailable.";
    } catch (error) {
        return "Could not generate explanation.";
    }
};

// Mock Fallbacks
const getMockQuestions = (): AnalyticalQuestion[] => [
  {
    question: "Which category drives the highest revenue?",
    feasibility: "High",
    requiredColumns: ["category", "revenue"],
    reasoning: "Columns present."
  },
  {
    question: "What is the trend of orders over time?",
    feasibility: "High",
    requiredColumns: ["date", "orders"],
    reasoning: "Date column exists."
  },
  {
    question: "Are there region specific performance gaps?",
    feasibility: "Medium",
    requiredColumns: ["region", "performance"],
    reasoning: "Region data available."
  }
];

const getMockRoadmap = (goal: string): GoalAnalysisResult => ({
  analysis: `Based on the data, we see opportunities to improve ${goal}.`,
  roadmap: [
    { step: 1, title: "Data Cleaning", action: "Remove outliers." },
    { step: 2, title: "Analyze Trends", action: `Review historical data for ${goal}.` },
    { step: 3, title: "Optimize", action: "Adjust operations." },
    { step: 4, title: "Monitor", action: "Track KPIs." }
  ],
  recommendations: [
    { category: "Operational", title: "Streamline Process", description: "Reduce wait times.", impact: "High" },
    { category: "Financial", title: "Cost Reduction", description: "Negotiate vendor contracts.", impact: "Medium" },
    { category: "Strategic", title: "Market Expansion", description: "Target new regions.", impact: "High" }
  ],
  dashboardConfig: [
    { title: "Total Revenue", type: "kpi", dataKey: "amount", aggregation: "sum" },
    { title: "Avg Order Value", type: "kpi", dataKey: "amount", aggregation: "average" },
    { title: "Sales by Region", type: "bar", dataKey: "amount", xAxisKey: "region", aggregation: "sum" },
    { title: "Monthly Trend", type: "line", dataKey: "amount", xAxisKey: "date", aggregation: "sum" }
  ]
});
