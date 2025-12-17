import React from 'react';
import { Loader2, Upload, FileText } from 'lucide-react';

interface UploadOverlayProps {
  isUploading: boolean;
  files: string[];
}

const UploadOverlay: React.FC<UploadOverlayProps> = ({ isUploading, files }) => {
  if (!isUploading) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Upload className="text-indigo-400" size={24} />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Uploading Files</h3>
            <p className="text-slate-600 text-sm mb-4">Please wait while we process your files...</p>
            <div className="space-y-2 max-h-48 overflow-y-auto w-full">
              {files.map((fileName, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-2">
                  <FileText size={16} className="text-indigo-500 flex-shrink-0" />
                  <span className="truncate flex-1">{fileName}</span>
                  <Loader2 className="animate-spin text-indigo-500" size={14} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadOverlay;

