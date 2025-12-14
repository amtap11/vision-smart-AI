import { Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { logDataAccess, AuditEventType } from '../utils/auditLogger';
import { sanitizeString, truncateString } from '../utils/sanitization';

const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const analyzeRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt is too long'),
  context: z.record(z.any()).optional(),
  model: z.string().default('gemini-2.5-flash'),
});

export async function analyzeData(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  try {
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API is not configured',
        message: 'API key is missing or invalid'
      });
      return;
    }

    const validatedData = analyzeRequestSchema.parse(req.body);
    const { prompt, context, model: modelName } = validatedData;

    // Build the full prompt with context if provided
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Context: ${JSON.stringify(context, null, 2)}\n\nPrompt: ${prompt}`;
    }

    // Log AI operation request
    await logDataAccess(
      AuditEventType.DATA_READ,
      req,
      userId,
      'gemini-api',
      'analyze',
      {
        model: modelName,
        promptLength: prompt.length,
        hasContext: !!context,
      }
    );

    // Generate content
    const result = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
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
