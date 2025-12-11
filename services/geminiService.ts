
import { GoogleGenAI, Type } from "@google/genai";
import { AnalyticalQuestion, ColumnProfile, RoadmapStep, Recommendation, GoalAnalysisResult, ChartConfig, ReportItem, ReportReview, Dataset, TransformationSuggestion, MergeSuggestion, StatisticalSuggestion } from "../types";

const apiKey = process.env.API_KEY || ''; 

// We use 2.5 flash for speed and efficiency in this interactive dashboard
const MODEL_NAME = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey });

// ... (Previous functions: generateIntrospectionQuestions, generateMoreIntrospectionQuestions, generateGoalSuggestions, generateGoalRoadmap, generateRecommendationAnalysis, generateQuestionAnalysis, generateChartExplanation, generateSingleChartConfig, generateFinalReport, generateChartContextForReport, evaluateReportQuality, analyzeCrossFilePatterns, suggestTransformations, suggestMergeStrategy, suggestStatisticalAnalyses, getMockQuestions, getMockRoadmap) ...

export const generateIntrospectionQuestions = async (
  columns: ColumnProfile[], 
  rowCount: number
): Promise<AnalyticalQuestion[]> => {
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock data.");
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalyticalQuestion[];
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return getMockQuestions();
  }
};

export const generateMoreIntrospectionQuestions = async (
  columns: ColumnProfile[],
  rowCount: number,
  existingQuestions: string[]
): Promise<AnalyticalQuestion[]> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalyticalQuestion[];
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini More Questions Error:", error);
    return [];
  }
};

export const generateGoalSuggestions = async (dataSummary: string): Promise<string[]> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
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
  if (!apiKey) {
    console.warn("No API Key. Returning mock roadmap.");
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
    - 'dataKey' MUST be an EXACT column name from the list above, OR 'count'.
    - If 'aggregation' is 'sum' or 'average', 'dataKey' MUST be a 'number' type column. Do NOT sum strings.
    - If you want to count records (e.g. number of visits), use 'count' as 'dataKey' and 'count' as aggregation.
    - 'xAxisKey' MUST be an EXACT column name (usually string or date) for grouping.
    - Use 'map' ONLY if the data contains region/city/location columns.
    - Use 'scatter' ONLY if you have two 'number' columns.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GoalAnalysisResult;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return getMockRoadmap(goal);
  }
};

export const generateRecommendationAnalysis = async (
  goal: string,
  recommendation: Recommendation,
  dataSummary: string
): Promise<string> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Unable to generate detailed analysis at this time.";
  }
};

export const generateQuestionAnalysis = async (
  question: string,
  dataSummary: string
): Promise<string> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "Could not generate an answer.";
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
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "No explanation generated.";
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
  if (!apiKey) {
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
    - 'dataKey' MUST be an EXACT column name from the list provided, or 'count' for counting records.
    - 'xAxisKey' MUST be an EXACT column name from the list provided.
    - Do NOT invent column names.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ChartConfig;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
     console.error("Gemini Single Chart Error:", error);
     throw error;
  }
};

export const generateFinalReport = async (
  items: ReportItem[],
  context: { audience: string; tone: string; notes: string }
): Promise<string> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "Report generation returned empty.";
  } catch (error) {
    console.error("Gemini Report Generation Error:", error);
    return "Failed to generate report due to an error.";
  }
};

// --- NEW FUNCTIONS FOR AGENTIC BEHAVIOR ---

export const generateChartContextForReport = async (
  chartConfig: ChartConfig,
  dataSample: any[]
): Promise<string> => {
  if (!apiKey) return `AI Analysis: This chart visualizes ${chartConfig.title}.`;

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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    return response.text || "Analysis pending.";
  } catch (error) {
    return "Analysis unavailable.";
  }
};

export const evaluateReportQuality = async (
  reportHtmlText: string
): Promise<ReportReview> => {
  if (!apiKey) {
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
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
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as ReportReview;
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
    if (!apiKey) {
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
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt
        });
        return response.text || "No insights found.";
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
  if (!apiKey) return [];

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
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            // REMOVING responseSchema to avoid "properties should be non-empty for OBJECT type" error on dynamic 'parameters' object
        }
    });

    if (response.text) return JSON.parse(response.text) as TransformationSuggestion[];
    throw new Error("Empty response");
  } catch (error) {
      console.error("Transform Suggestion Error", error);
      return [];
  }
};

export const suggestMergeStrategy = async (
    files: { fileName: string, schema: string }[]
): Promise<MergeSuggestion> => {
    if (!apiKey) return {
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
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
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
            }
        });

        if (response.text) return JSON.parse(response.text) as MergeSuggestion;
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
  if (!apiKey) return [];

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
     const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
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
        }
     });

     if (response.text) return JSON.parse(response.text) as StatisticalSuggestion[];
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
    if (!apiKey) return { text: "I can help you optimize your model. (API Key required for real advice)" };

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
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                responseMimeType: "application/json"
                // Removed responseSchema to allow dynamic 'payload' object
            }
        });
        
        if (response.text) return JSON.parse(response.text);
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
    if (!apiKey) return { x: numericColumns[0], y: numericColumns[1], k: 3, reasoning: "Mock suggestion" };

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
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        if (response.text) return JSON.parse(response.text);
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
    if (!apiKey) return { dateCol: dateColumns[0], valueCol: numericColumns[0], reasoning: "Mock suggestion" };

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
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        if (response.text) return JSON.parse(response.text);
        throw new Error("Empty");
    } catch (e) {
        return { dateCol: dateColumns[0], valueCol: numericColumns[0], reasoning: "Defaulting due to error" };
    }
};

export const explainStatistic = async (
    type: 'regression' | 'clustering' | 'correlation' | 'forecast',
    dataContext: any
): Promise<string> => {
    if (!apiKey) return "AI Explanation: This statistical model shows significant trends based on the input variables.";

    const prompt = `
        Role: Expert Data Scientist
        Task: Explain a specific statistical result to a business user. Keep it simple but accurate.
        
        Analysis Type: ${type}
        
        Result Data:
        ${JSON.stringify(dataContext).substring(0, 1000)}

        Explanation Requirements:
        1. What does this result mean? (e.g., "Advertising Spend strongly predicts Revenue")
        2. How confident are we? (Mention R-Squared, Correlation coefficient, or Cluster tightness if available)
        3. One actionable takeaway.

        Output: A single paragraph (max 60 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt
        });
        return response.text || "Analysis unavailable.";
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
