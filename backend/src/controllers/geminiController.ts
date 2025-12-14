import { Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const analyzeRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context: z.record(z.any()).optional(),
  model: z.string().default('gemini-2.5-flash'),
  responseMimeType: z.string().optional(),
  responseSchema: z.any().optional(),
});

// Helper to convert string-based schema back to Type enum schema for Gemini
function convertSchemaToTypeEnum(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;

  const typeStringMap: Record<string, any> = {
    'string': Type.STRING,
    'number': Type.NUMBER,
    'integer': Type.INTEGER,
    'boolean': Type.BOOLEAN,
    'array': Type.ARRAY,
    'object': Type.OBJECT,
  };

  if (Array.isArray(schema)) {
    return schema.map(item => convertSchemaToTypeEnum(item));
  }

  const converted: any = {};
  for (const key in schema) {
    const value = schema[key];
    
    if (key === 'type' && typeof value === 'string' && typeStringMap[value]) {
      converted[key] = typeStringMap[value];
    } else if (value && typeof value === 'object') {
      if ('type' in value && typeof value.type === 'string' && typeStringMap[value.type]) {
        converted[key] = {
          ...value,
          type: typeStringMap[value.type],
          items: value.items ? convertSchemaToTypeEnum(value.items) : value.items,
          properties: value.properties ? convertSchemaToTypeEnum(value.properties) : value.properties
        };
      } else {
        converted[key] = convertSchemaToTypeEnum(value);
      }
    } else {
      converted[key] = value;
    }
  }

  return converted;
}

export async function analyzeData(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API is not configured',
        message: 'API key is missing or invalid'
      });
      return;
    }

    const validatedData = analyzeRequestSchema.parse(req.body);
    const { prompt, context, model: modelName, responseMimeType, responseSchema } = validatedData;

    // Build the full prompt with context if provided
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Context: ${JSON.stringify(context, null, 2)}\n\nPrompt: ${prompt}`;
    }

    // Prepare config for structured responses if needed
    const config: any = {};
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }
    if (responseSchema) {
      // Convert string-based schema back to Type enum for Gemini SDK
      config.responseSchema = convertSchemaToTypeEnum(responseSchema);
    }

    // Generate content
    const result = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    const text = result.text;

    res.json({
      success: true,
      result: text,
      model: modelName,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
      return;
    }

    console.error('Gemini API error:', error);

    if (error instanceof Error) {
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Analysis failed' });
  }
}
