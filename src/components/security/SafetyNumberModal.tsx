import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Copy, Check, QrCode } from 'lucide-react';
import { generateSafetyNumbers } from '../../lib/encryption';
import { Conversation } from '../../types';

interface SafetyNumberModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({ conversation, onClose }) => {
  const [chunks, setChunks] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    generateSafetyNumbers(conversation.id, conversation.participantIds).then(setChunks);
  }, [conversation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chunks.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">End-to-End Encryption</h3>
              <p className="text-xs text-slate-400">Verified Session Safety Number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Messages, video notes, voice clips, and calls with <strong>{conversation.title}</strong> are protected with 256-bit AES-GCM end-to-end encryption. Only members of this conversation hold the cryptographic keys.
            </p>
          </div>

          {/* QR Pattern visual */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
            <div className="w-32 h-32 bg-white rounded-xl p-2.5 flex items-center justify-center shadow-inner">
              <div className="w-full h-full border-4 border-slate-900 rounded-lg p-1.5 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-6 h-6 bg-slate-900 rounded-sm" />
                  <div className="w-6 h-6 bg-slate-900 rounded-sm" />
                </div>
                <div className="flex justify-center items-center py-1">
                  <QrCode className="w-8 h-8 text-slate-900" />
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 bg-slate-900 rounded-sm" />
                  <div className="w-4 h-4 bg-indigo-600 rounded-full" />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-mono tracking-wider">
              KEY FINGERPRINT: {conversation.sharedKeyFingerprint}
            </span>
          </div>

          {/* 60-digit number */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Safety Number (Compare with partner/friend)</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-center text-xs tracking-wider text-emerald-300">
              {chunks.map((chunk, idx) => (
                <div key={idx} className="bg-slate-900/80 py-1.5 px-2 rounded border border-slate-800/80">
                  {chunk}
                </div>
              ))}
            </div>
          </div>

          {/* Verification status toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${isVerified ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-200">Safety Number Verified</span>
            </div>
            <button
              onClick={() => setIsVerified(!isVerified)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isVerified
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isVerified ? 'Verified ✓' : 'Mark as Verified'}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
