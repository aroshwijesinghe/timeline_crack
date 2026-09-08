import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { sampleTimelineJSON } from '../../demo/sampleTimeline';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (jsonData: any, fileName: string) => void;
  hasExistingData: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  hasExistingData
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.endsWith('.json')) {
      setErrorMsg('Please upload a valid .json file (e.g. Timeline.json).');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        onDataLoaded(parsed, file.name);
        setLoading(false);
        onClose();
      } catch (err: any) {
        setErrorMsg(`Failed to parse JSON: ${err.message}`);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file from disk.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadDemo = () => {
    onDataLoaded(sampleTimelineJSON, 'Demo_Tour_Sri_Lanka.json');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Upload Google Timeline JSON
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select or drop your exported <code className="text-indigo-300">Timeline.json</code> file
            </p>
          </div>
          {hasExistingData && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drop Zone */}
        <div className="py-4 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                : 'border-slate-700 bg-slate-950/40 hover:border-indigo-500/60 hover:bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
              <FileCode className="w-7 h-7" />
            </div>

            <p className="text-sm font-semibold text-white mb-1">
              Drag & Drop your <span className="text-indigo-400">Timeline.json</span> here
            </p>
            <p className="text-xs text-slate-400">
              or click anywhere to browse from your device
            </p>
            <span className="mt-3 text-[11px] px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
              Supports modern & legacy Google Takeout formats
            </span>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleLoadDemo}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-slate-950 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold text-indigo-300 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Try Interactive Demo</span>
            </button>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block mb-0.5">100% Client-Side & Private</strong>
              Your timeline data is processed strictly in your browser and is never stored on or sent to any server.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
