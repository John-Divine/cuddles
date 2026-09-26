import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';

interface MediaSendPreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  fileName?: string;
  onSend: (caption?: string) => Promise<void> | void;
  onClose: () => void;
}

export const MediaSendPreviewModal: React.FC<MediaSendPreviewModalProps> = ({
  isOpen,
  imageUrl,
  fileName,
  onSend,
  onClose
}) => {
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      await onSend(caption.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to send image preview:', err);
    } finally {
      setIsSending(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-900/98 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Preview Photo</h3>
              <p className="text-[11px] text-slate-400">
                {fileName ? fileName : 'Ready to send to chat'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 min-h-[220px] max-h-[58vh] bg-slate-950/80 flex items-center justify-center p-3 overflow-hidden relative">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-full max-w-full object-contain rounded-2xl shadow-lg ring-1 ring-white/10"
          />
        </div>

        {/* Caption & Send Actions */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-900 border-t border-slate-800/80 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Add a caption... (optional)"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-lg shadow-rose-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
