# Gemini API Setup Guide

This guide ensures Gemini AI is working in all features of Vision Smart AI.

## Quick Setup

### Option 1: Frontend Configuration (Recommended for Development)

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_URL=http://localhost:3001
```

**Get your API key:** https://makersuite.google.com/app/apikey

### Option 2: Backend Configuration (Recommended for Production)

Add to `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Features Using Gemini

All these features require the Gemini API key:

### ✅ Smart Analysis Features
- **Introspection Questions** - Generates relevant business questions
- **Goal Suggestions** - Suggests strategic business goals
- **Goal Roadmap** - Creates analytical roadmaps
- **Recommendation Analysis** - Deep dives into recommendations
- **Question Analysis** - Answers data questions

### ✅ Dashboard Features
- **Chart Explanations** - Explains what metrics mean
- **Custom Chart Generation** - Creates charts from natural language

### ✅ Data Studio Features
- **Transformation Suggestions** - Suggests data cleaning steps
- **Merge Strategy** - Recommends how to combine datasets
- **Custom Transformations** - Interprets natural language transformations

### ✅ Multi-File Analysis
- **Cross-File Patterns** - Finds correlations across datasets
- **Statistical Suggestions** - Suggests regression/correlation analyses
- **Model Advisor** - AI assistant for advanced analytics
- **Clustering Setup** - Suggests optimal clustering parameters
- **Forecasting Setup** - Recommends time series configurations
- **Statistic Explanations** - Explains statistical results

### ✅ Report Generation
- **Final Report** - Generates executive reports
- **Chart Context** - Writes chart descriptions
- **Report Quality Review** - Evaluates report quality
- **Relevant Chart Suggestions** - Suggests charts to insert

## Verification

After setting up the API key:

1. **Restart both servers:**
   ```bash
   # Frontend
   npm run dev
   
   # Backend (in separate terminal)
   cd backend
   npm run dev
   ```

2. **Test a feature:**
   - Upload a CSV file
   - Go to Smart Analysis
   - Check if introspection questions are generated (not mock data)

3. **Check console:**
   - If you see "No API Key provided. Returning mock data" warnings, the key is not configured correctly
   - If you see Gemini API errors, check the API key validity

## Troubleshooting

### Issue: "No API Key provided" warnings

**Solution:**
- Ensure `.env.local` exists in project root with `GEMINI_API_KEY=...`
- Restart the frontend dev server
- Check that the key doesn't have quotes around it

### Issue: "Gemini API is not configured" (Backend)

**Solution:**
- Ensure `backend/.env` has `GEMINI_API_KEY=...`
- Restart the backend server
- Check backend logs for errors

### Issue: API errors (401, 403, etc.)

**Solution:**
- Verify your API key is valid at https://makersuite.google.com/app/apikey
- Check API quota/limits
- Ensure the key has proper permissions

### Issue: API errors (Rate limits)

**Solution:**
- Gemini has rate limits per minute/hour
- Wait a few minutes and try again
- Consider upgrading your API plan if needed

## Environment Variable Priority

The system checks for API keys in this order:

1. `process.env.API_KEY` (from vite.config.ts)
2. `process.env.GEMINI_API_KEY` (from vite.config.ts)
3. `import.meta.env.GEMINI_API_KEY` (Vite environment)

The `vite.config.ts` loads from:
- `.env.local` (highest priority, not committed to git)
- `.env` (committed to git, lower priority)

## Security Notes

- **Never commit API keys to git**
- Use `.env.local` for local development (already in .gitignore)
- Use environment variables in production
- Backend API key should be in `backend/.env` (already in .gitignore)

## Testing

To verify Gemini is working:

1. Upload a sample CSV
2. Navigate to Smart Analysis → Introspection
3. You should see AI-generated questions (not generic mock questions)
4. Check browser console - no "No API Key" warnings

If you see mock data, the API key is not configured correctly.

