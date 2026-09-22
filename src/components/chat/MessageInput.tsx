import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Image as ImageIcon,
  Camera,
  Mic,
  Video,
  Smile,
  Sparkles,
  Paperclip,
  X,
  Zap,
  BellRing,
  Moon,
  Plus
} from 'lucide-react';
import { GifPicker } from './GifPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoNoteRecorder } from './VideoNoteRecorder';
import { CameraCaptureModal } from './CameraCaptureModal';
import { MessagePriority, MessageType } from '../../types';

interface MessageInputProps {
  onSendMessage: (text: string, priority?: MessagePriority) => void;
  onSendMedia: (
    type: MessageType,
    url: string,
    durationSeconds?: number,
    attachmentMeta?: {
      fileName?: string;
      fileSizeBytes?: number;
      fileSize?: string;
      mimeType?: string;
    }
  ) => void;
  onTyping?: () => void;
  recipientIsBusy?: boolean;
  recipientName?: string;
  recipientActivity?: string;
}

interface PendingDocument {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  mimeType: string;
  url: string;
  type: MessageType;
}

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024; // 50 Megabytes limit

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendMedia,
  onTyping,
  recipientIsBusy = false,
  recipientName = 'Contact',
  recipientActivity = 'Busy'
}) => {
  const [text, setText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingVideoNote, setIsRecordingVideoNote] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showPlusMenu]);

  const handleSend = () => {
    if (pendingDocument) {
      onSendMedia(
        pendingDocument.type,
        pendingDocument.url,
        undefined,
        {
          fileName: pendingDocument.name,
          fileSizeBytes: pendingDocument.sizeBytes,
          fileSize: pendingDocument.sizeFormatted,
          mimeType: pendingDocument.mimeType
        }
      );
      setPendingDocument(null);
    }
    if (pendingImage) {
      onSendMedia('image', pendingImage);
      setPendingImage(null);
    }
    if (text.trim()) {
      onSendMessage(text.trim(), isUrgent ? 'urgent' : 'normal');
      setText('');
      setIsUrgent(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      setFileError(`Image exceeds the 50MB limit (${formatBytes(file.size)}). Please choose a smaller image.`);
      e.target.value = '';
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      setFileError(`File is ${formatBytes(file.size)}. The maximum allowed limit is 50 MB.`);
      e.target.value = '';
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const isVid = file.type.startsWith('video/');
        const isImg = file.type.startsWith('image/');
        setPendingDocument({
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formatBytes(file.size),
          mimeType: file.type || 'application/octet-stream',
          url: reader.result,
          type: isVid ? 'video' : isImg ? 'image' : 'document'
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="relative p-2.5 sm:p-3 bg-slate-900/90 border-t border-rose-950/40 backdrop-blur-md">
      {/* Video Note Recorder Modal (portaled to document.body, centered overlay) */}
      {isRecordingVideoNote && (
        <VideoNoteRecorder
          onComplete={(url, duration) => {
            setIsRecordingVideoNote(false);
            onSendMedia('video_note', url, duration);
          }}
          onCancel={() => setIsRecordingVideoNote(false)}
        />
      )}

      {/* Camera Capture Modal (take photo with live camera viewfinder) */}
      {isTakingPhoto && (
        <CameraCaptureModal
          onCapture={(imageDataUrl, caption) => {
            setIsTakingPhoto(false);
            if (caption && caption.trim()) {
              onSendMedia('image', imageDataUrl, undefined, { fileName: `photo_${Date.now()}.jpg` });
              onSendMessage(caption.trim(), isUrgent ? 'urgent' : 'normal');
            } else {
              onSendMedia('image', imageDataUrl, undefined, { fileName: `photo_${Date.now()}.jpg` });
            }
          }}
          onClose={() => setIsTakingPhoto(false)}
        />
      )}

      {/* Voice Note Recorder Modal (portaled to document.body, centered overlay) */}
      {isRecordingVoice && (
        <VoiceRecorder
          onComplete={(url, duration) => {
            setIsRecordingVoice(false);
            onSendMedia('voice', url, duration);
          }}
          onCancel={() => setIsRecordingVoice(false)}
        />
      )}

      {/* Smart Schedule / Quiet Delivery Notice */}
          {recipientIsBusy && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 truncate">
                <Moon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">
                  {recipientName} is scheduled: <strong className="text-white">{recipientActivity}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  isUrgent
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 fill-current text-amber-300" />
                {isUrgent ? 'Urgent Mode ON' : 'Make Urgent'}
              </button>
            </div>
          )}

          {/* File size warning alert */}
          {fileError && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
              <span>{fileError}</span>
              <button onClick={() => setFileError(null)} className="text-rose-200 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pending Document Card Preview */}
          {pendingDocument && (
            <div className="mb-2 p-2.5 rounded-xl bg-slate-800/90 border border-rose-500/40 flex items-center justify-between gap-3 text-xs max-w-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-white block truncate">{pendingDocument.name}</span>
                  <span className="text-[11px] text-slate-400">{pendingDocument.sizeFormatted} • Will purge online once downloaded</span>
                </div>
              </div>
              <button
                onClick={() => setPendingDocument(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Image Preview */}
          {pendingImage && (
            <div className="mb-2 relative inline-block rounded-xl overflow-hidden border border-rose-500/40 shadow-lg">
              <img src={pendingImage} alt="attachment preview" className="h-20 w-auto object-cover rounded-xl" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black/90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* GIF Picker popup */}
          {showGifPicker && (
            <GifPicker
              onSelect={(url) => {
                setShowGifPicker(false);
                onSendMedia('gif', url);
              }}
              onClose={() => setShowGifPicker(false)}
            />
          )}

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocumentChange}
            accept="*/*"
            className="hidden"
          />

          {/* Main Input Row */}
          <div className="flex items-end gap-1.5 sm:gap-2 relative">
            {/* Mobile Plus (+) Button & Expandable Action Menu */}
            <div className="relative pb-0.5 sm:hidden" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all active:scale-95 shadow-sm ${
                  showPlusMenu
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 rotate-45'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white border-slate-700/70 hover:bg-slate-700/80'
                }`}
                title="Options & Attachments"
                aria-label="Add attachment"
              >
                <Plus className="w-5 h-5 transition-transform duration-200" />
              </button>

              {/* Mobile Attachments Popup Menu */}
              {showPlusMenu && (
                <div className="absolute bottom-12 left-0 w-52 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setIsTakingPhoto(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Take Photo</div>
                      <div className="text-[10px] text-slate-400">Camera snapshot</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Photo Library</div>
                      <div className="text-[10px] text-slate-400">Send photos & images</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Document / Video</div>
                      <div className="text-[10px] text-slate-400">Files up to 50MB</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setShowGifPicker(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Cuddle GIF</div>
                      <div className="text-[10px] text-slate-400">Romantic reactions</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsUrgent(!isUrgent);
                      setShowPlusMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                      isUrgent
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isUrgent ? 'bg-rose-500 text-white' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{isUrgent ? 'Urgent Enabled' : 'Urgent Mode'}</div>
                      <div className="text-[10px] text-slate-400">Bypasses quiet schedule</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Direct Action Icons */}
            <div className="hidden sm:flex items-center gap-0.5 pb-1">
              <button
                type="button"
                onClick={() => setIsTakingPhoto(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Take Photo with Camera"
              >
                <Camera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Attach Photo (Max 50MB)"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Attach Document or Video (Max 50MB)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowGifPicker(!showGifPicker)}
                className="p-2 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Send Cuddle GIF"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Quick Urgent / Priority Toggle */}
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className={`p-2 rounded-xl active:scale-95 transition-all ${
                  isUrgent
                    ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80'
                }`}
                title={isUrgent ? 'Urgent message (bypasses quiet mode)' : 'Mark as Urgent'}
              >
                <Zap className={`w-4.5 h-4.5 ${isUrgent ? 'fill-rose-400' : ''}`} />
              </button>
            </div>

            {/* Expanding Textarea */}
            <div className={`flex-1 min-h-[42px] max-h-32 rounded-2xl bg-slate-800/90 border px-3 py-2 flex items-center transition-all ${
              isUrgent
                ? 'border-rose-500/80 ring-2 ring-rose-500/30'
                : 'border-slate-700/80 focus-within:border-rose-500/70 focus-within:ring-1 focus-within:ring-rose-500/30'
            }`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  onTyping?.();
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={isUrgent ? '⚡ Send as URGENT message...' : 'Cuddles encrypted message...'}
                className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder-slate-400 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Action Buttons: If text entered -> Distinctive Upward Speed Send Button. If empty -> Mic & Video Note */}
            <div className="flex items-center gap-1 pb-0.5 sm:pb-1 shrink-0">
              {text.trim() || pendingImage || pendingDocument ? (
                /* Distinctive Send Button with Modern ArrowUp Icon inside romantic glowing gradient */
                <button
                  type="button"
                  onClick={handleSend}
                  className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-lg active:scale-95 transition-all ${
                    isUrgent
                      ? 'bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-rose-600/35 ring-2 ring-rose-400'
                      : 'bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:via-pink-500 hover:to-indigo-500 shadow-rose-500/25'
                  }`}
                  title={isUrgent ? 'Send URGENT message' : 'Send Encrypted Message'}
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              ) : (
                <>
                  {/* Video Note Button */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingVideoNote(true)}
                    className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 active:scale-95 border border-slate-700/60 shadow-sm transition-all flex items-center justify-center"
                    title="Record Circular Video Note"
                    aria-label="Record Video Note"
                  >
                    <Video className="w-4.5 h-4.5" />
                  </button>

                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 active:scale-95 border border-slate-700/60 shadow-sm transition-all flex items-center justify-center"
                    title="Record Voice Note"
                    aria-label="Record Voice Note"
                  >
                    <Mic className="w-4.5 h-4.5" />
                  </button>
                </>
              )}
            </div>
          </div>
    </div>
  );
};
