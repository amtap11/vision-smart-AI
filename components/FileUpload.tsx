
import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { parseCSV, generateQualityReport, generateDemoData } from '../services/dataService';
import { PatientRecord, DataQualityReport } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: PatientRecord[], report: DataQualityReport) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const data = await parseCSV(file);
      const report = generateQualityReport(data);
      onDataLoaded(data, report);
    } catch (err) {
      setError("Failed to parse file. Please ensure it is a valid CSV.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDownloadTemplate = () => {
    const csv = generateDemoData();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vision_smart_demo.csv';
    a.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Description Phase</h2>
        <p className="text-slate-500">Upload your business dataset to begin the analysis process.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'}
          ${loading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600">
            <Upload size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">Drag & drop your file here</h3>
            <p className="text-slate-500 text-sm mt-1">Supports .CSV files up to 50MB</p>
          </div>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
              Browse Files
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
         <button 
           onClick={handleDownloadTemplate}
           className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm transition-colors"
         >
           <Download size={16} />
           Download Demo Dataset
         </button>
      </div>

      {loading && (
        <div className="mt-6 text-center text-blue-600 animate-pulse">
          Processing data structure...
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
