import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AIDiagnosticsProps {
  onClose: () => void;
}

const AIDiagnostics: React.FC<AIDiagnosticsProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    backend: { status: 'checking' | 'ok' | 'error'; message: string };
    auth: { status: 'checking' | 'ok' | 'error'; message: string };
    apiKey: { status: 'checking' | 'ok' | 'error'; message: string };
    testCall: { status: 'checking' | 'ok' | 'error'; message: string };
  } | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics = {
      backend: { status: 'checking' as const, message: 'Checking backend connection...' },
      auth: { status: 'checking' as const, message: 'Checking authentication...' },
      apiKey: { status: 'checking' as const, message: 'Checking API key...' },
      testCall: { status: 'checking' as const, message: 'Testing AI call...' },
    };
    setResults(diagnostics);

    // 1. Check backend connection
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/health`);
      if (response.ok) {
        diagnostics.backend = { status: 'ok', message: 'Backend is running' };
      } else {
        diagnostics.backend = { status: 'error', message: `Backend returned status ${response.status}` };
      }
    } catch (error: any) {
      diagnostics.backend = { 
        status: 'error', 
        message: `Cannot connect to backend: ${error.message}. Make sure backend is running on port 3001.` 
      };
    }
    setResults({ ...diagnostics });

    // 2. Check authentication
    const token = apiClient.getToken();
    if (token) {
      try {
        await apiClient.getCurrentUser();
        diagnostics.auth = { status: 'ok', message: 'User is authenticated' };
      } catch (error: any) {
        diagnostics.auth = { status: 'error', message: `Auth token invalid: ${error.message}` };
      }
    } else {
      diagnostics.auth = { status: 'error', message: 'No authentication token found. Please log in.' };
    }
    setResults({ ...diagnostics });

    // 3. Check API key (backend should have it)
    if (diagnostics.backend.status === 'ok' && diagnostics.auth.status === 'ok') {
      try {
        const testResponse = await apiClient.analyzeWithGemini('Say "test"', undefined, { model: 'gemini-3' });
        if (testResponse && testResponse.result) {
          diagnostics.apiKey = { status: 'ok', message: 'API key is configured and working' };
          diagnostics.testCall = { status: 'ok', message: 'AI test call successful' };
        } else {
          diagnostics.apiKey = { status: 'error', message: 'API key may be invalid - got empty response' };
          diagnostics.testCall = { status: 'error', message: 'AI test call returned empty response' };
        }
      } catch (error: any) {
        if (error.message.includes('503') || error.message.includes('not configured')) {
          diagnostics.apiKey = { status: 'error', message: 'GEMINI_API_KEY not set in backend/.env' };
        } else {
          diagnostics.apiKey = { status: 'error', message: `API key error: ${error.message}` };
        }
        diagnostics.testCall = { status: 'error', message: `AI test call failed: ${error.message}` };
      }
    } else {
      diagnostics.apiKey = { status: 'error', message: 'Cannot test - backend or auth failed' };
      diagnostics.testCall = { status: 'error', message: 'Cannot test - backend or auth failed' };
    }
    setResults({ ...diagnostics });
    setIsRunning(false);
  };

  const getStatusIcon = (status: 'checking' | 'ok' | 'error') => {
    if (status === 'checking') return <Loader2 className="animate-spin text-blue-500" size={20} />;
    if (status === 'ok') return <CheckCircle className="text-green-500" size={20} />;
    return <XCircle className="text-red-500" size={20} />;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={24} />
            AI Diagnostics
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {results ? (
            <>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(results.backend.status)}
                  <h3 className="font-semibold text-slate-700">Backend Connection</h3>
                </div>
                <p className="text-sm text-slate-600 ml-8">{results.backend.message}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(results.auth.status)}
                  <h3 className="font-semibold text-slate-700">Authentication</h3>
                </div>
                <p className="text-sm text-slate-600 ml-8">{results.auth.message}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(results.apiKey.status)}
                  <h3 className="font-semibold text-slate-700">API Key</h3>
                </div>
                <p className="text-sm text-slate-600 ml-8">{results.apiKey.message}</p>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(results.testCall.status)}
                  <h3 className="font-semibold text-slate-700">Test AI Call</h3>
                </div>
                <p className="text-sm text-slate-600 ml-8">{results.testCall.message}</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">
              Click "Run Diagnostics" to check your AI configuration
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Running Diagnostics...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDiagnostics;

