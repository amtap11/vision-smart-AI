# Quick Fix: Gemini API Not Working

## Problem
You put the API key in `backend/.env` but the frontend is trying to call Gemini directly, which requires the key in the frontend environment.

## Solution
The code has been updated to use the backend API when you're logged in. 

**IMPORTANT: You must be logged in for Gemini to work!**

## Steps to Fix:

1. **Ensure backend has the API key:**
   - Check `backend/.env` has: `GEMINI_API_KEY=your_key_here`
   - Restart the backend server

2. **Make sure you're logged in:**
   - Go to http://localhost:3000
   - Log in with your account (mohammed.alnjjar.ma@gmail.com)
   - The frontend will now use the backend API automatically

3. **Restart both servers:**
   ```bash
   # Stop both servers (Ctrl+C)
   # Then restart:
   
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend  
   npm run dev
   ```

4. **Test:**
   - Upload a CSV file
   - Go to Smart Analysis
   - You should see AI-generated questions (not mock data)

## If Still Not Working:

Check browser console (F12) for errors. Common issues:

- **"Failed to call Gemini API through backend"** → Backend not running or API key missing
- **"Network error"** → Backend server not accessible
- **"401 Unauthorized"** → Not logged in (must log in first!)

## Note:
The frontend will automatically use the backend API when you're authenticated. No need to put the API key in frontend `.env.local` anymore!

