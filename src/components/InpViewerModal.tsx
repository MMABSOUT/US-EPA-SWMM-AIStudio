import React, { useState, useEffect } from 'react';
import { SWMMModel } from '../types/swmm';
import { serializeToINP, parseINPToModel } from '../engine/inp-parser';
import { FileCode, Download, Copy, Play, Check, Upload, X } from 'lucide-react';

interface InpViewerModalProps {
  model: SWMMModel;
  isOpen: boolean;
  onClose: () => void;
  onApplyINP: (newModel: SWMMModel) => void;
}

export const InpViewerModal: React.FC<InpViewerModalProps> = ({
  model,
  isOpen,
  onClose,
  onApplyINP,
}) => {
  const [inpText, setInpText] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInpText(serializeToINP(model));
      setParseError(null);
    }
  }, [isOpen, model]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(inpText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([inpText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.inp`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        setInpText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    try {
      const parsed = parseINPToModel(inpText, model);
      setParseError(null);
      onApplyINP(parsed);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse INP text');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                EPA SWMM 5.2 Input File (.INP)
              </h3>
              <p className="text-xs text-slate-400">
                Universal input file format compatible with US EPA SWMM 5.2 desktop software.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Import .INP</span>
              <input type="file" accept=".inp,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .INP</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error notification if parse failure */}
        {parseError && (
          <div className="bg-rose-950/80 border-b border-rose-800 text-rose-300 px-6 py-2 text-xs font-mono">
            Error: {parseError}
          </div>
        )}

        {/* Text Editor Area */}
        <div className="flex-1 p-4 bg-slate-950 overflow-hidden flex flex-col">
          <textarea
            value={inpText}
            onChange={e => setInpText(e.target.value)}
            className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none selection:bg-cyan-500/30 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs">
          <span className="text-slate-400">
            Edit parameters directly above and click "Apply & Run Simulation" to recalculate hydrology and hydraulics.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Apply & Run Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
