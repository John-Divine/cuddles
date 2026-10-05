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
  Plus,
  Heart
} from 'lucide-react';
import { GifPicker } from './GifPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoNoteRecorder } from './VideoNoteRecorder';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CameraVideoModal } from './CameraVideoModal';
import { MediaSendPreviewModal } from './MediaSendPreviewModal';
import { compressImage } from '../../lib/imageUtils';
import { MessagePriority, MessageType } from '../../types';
import { AkomaIcon } from '../common/AdinkraIcons';

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
      thumbnailUrl?: string;
    }
  ) => void;
  onTyping?: () => void;
  recipientIsBusy?: boolean;
  recipientName?: string;
  recipientActivity?: string;
  onOpenIntimacyHub?: () => void;
  onOpenMemoriesVault?: () => void;
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
  recipientActivity = 'Busy',
  onOpenIntimacyHub,
  onOpenMemoriesVault
}) => {
  const [text, setText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingVideoNote, setIsRecordingVideoNote] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
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
    if (!showPlusMenu) return;
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    // Use timeout to prevent the current toggle event from immediately dismissing
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutsideClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutsideClick);
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
      return;
    }

    setFileError(null);
    try {
      const previewUrl = URL.createObjectURL(file);
      setSelectedImageFile({ file, previewUrl });
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedImageFile({ file, previewUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmSendPreviewImage = async (caption?: string) => {
    if (!selectedImageFile) return;
    const { file, previewUrl } = selectedImageFile;
    try {
      let finalDataUrl = '';
      try {
        finalDataUrl = await compressImage(file, 1080, 1080, 0.75);
      } catch (compErr) {
        console.warn('Image compression error, using FileReader fallback:', compErr);
      }

      if (!finalDataUrl) {
        finalDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }

      if (finalDataUrl) {
        onSendMedia('image', finalDataUrl, undefined, {
          fileName: file.name || `photo_${Date.now()}.jpg`,
          fileSizeBytes: file.size,
          mimeType: 'image/jpeg'
        });
        if (caption && caption.trim()) {
          onSendMessage(caption.trim(), isUrgent ? 'urgent' : 'normal');
        }
      }
    } catch (err) {
      console.error('Failed to send image preview:', err);
    } finally {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedImageFile(null);
    }
  };

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOCUMENT_BYTES) {
      setFileError(`File is ${formatBytes(file.size)}. The maximum allowed limit is 50 MB.`);
      e.target.value = '';
      return;
    }

    setFileError(null);
    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');

    if (isImg) {
      try {
        const compressed = await compressImage(file, 960, 960, 0.75);
        setPendingDocument({
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formatBytes(file.size),
          mimeType: 'image/jpeg',
          url: compressed,
          type: 'image'
        });
        e.target.value = '';
        return;
      } catch (err) {
        console.warn('Doc image compression fallback:', err);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
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
    <div className="relative p-2.5 sm:p-3 bg-[#021810]/95 border-t border-amber-500/25 backdrop-blur-md w-full max-w-full overflow-visible">
      {/* Video Note Recorder Modal (portaled to document.body, centered overlay) */}
      {isRecordingVideoNote && (
        <VideoNoteRecorder
          onComplete={(url, duration, posterUrl, mimeType, fileSizeBytes) => {
            setIsRecordingVideoNote(false);
            const ext = mimeType?.includes('webm') ? 'webm' : 'mp4';
            const sizeFormatted = fileSizeBytes ? `${Math.round(fileSizeBytes / 1024)} KB` : undefined;
            onSendMedia('video_note', url, duration, {
              fileName: `vnote_${Date.now()}.${ext}`,
              thumbnailUrl: posterUrl,
              mimeType: mimeType || 'video/webm',
              fileSizeBytes,
              fileSize: sizeFormatted
            });
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

      {/* Normal Camera Video Recorder Modal */}
      {isRecordingVideo && (
        <CameraVideoModal
          onCapture={(videoUrl, durationSeconds, caption) => {
            setIsRecordingVideo(false);
            onSendMedia('video', videoUrl, durationSeconds, {
              fileName: `video_${Date.now()}.mp4`,
              mimeType: 'video/mp4'
            });
            if (caption && caption.trim()) {
              onSendMessage(caption.trim(), isUrgent ? 'urgent' : 'normal');
            }
          }}
          onClose={() => setIsRecordingVideo(false)}
        />
      )}

      {/* Mobile Photo Gallery Send Preview Modal */}
      {selectedImageFile && (
        <MediaSendPreviewModal
          isOpen={!!selectedImageFile}
          imageUrl={selectedImageFile.previewUrl}
          fileName={selectedImageFile.file.name}
          onSend={handleConfirmSendPreviewImage}
          onClose={() => {
            if (selectedImageFile.previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(selectedImageFile.previewUrl);
            }
            setSelectedImageFile(null);
          }}
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

          {/* File Inputs (zero-size, accessible to browser event dispatch on mobile) */}
          <input
            type="file"
            ref={imageInputRef}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            onChange={handleImageChange}
            accept="image/*"
            className="fixed -top-96 -left-96 opacity-0 pointer-events-none w-1 h-1"
          />
          <input
            type="file"
            ref={docInputRef}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            onChange={handleDocumentChange}
            accept="*/*"
            className="fixed -top-96 -left-96 opacity-0 pointer-events-none w-1 h-1"
          />

          {/* Main Input Row */}
          <div className="flex items-end gap-1.5 sm:gap-2 relative w-full max-w-full min-w-0">
            {/* Plus (+) Button & Expandable Action Menu */}
            <div className="relative pb-0.5 shrink-0 flex items-center gap-1.5" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setShowPlusMenu((prev) => !prev)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all active:scale-95 shadow-sm cursor-pointer ${
                  showPlusMenu
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400 rotate-45'
                    : 'bg-emerald-950 text-emerald-200 hover:text-amber-300 border-emerald-800 hover:bg-emerald-900'
                }`}
                title="Options & Attachments"
                aria-label="Add attachment"
              >
                <Plus size={22} className="w-5 h-5 transition-transform duration-200 shrink-0" strokeWidth={2.4} />
              </button>

              {/* Mobile Quick Urgent Priority Toggle */}
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all active:scale-95 shadow-sm cursor-pointer ${
                  isUrgent
                    ? 'bg-gradient-to-tr from-amber-600 to-rose-600 text-white ring-2 ring-amber-400 shadow-amber-600/40 border-amber-400'
                    : 'bg-emerald-950 text-emerald-300 hover:text-amber-400 border-emerald-800 hover:bg-emerald-900'
                }`}
                title={isUrgent ? 'Urgent Mode Active (Bypasses Quiet Mode)' : 'Mark as Urgent'}
                aria-label="Urgent Priority"
              >
                <Zap className={`w-4.5 h-4.5 ${isUrgent ? 'fill-white text-white' : ''}`} />
              </button>

              {/* Plus (+) Action Palette - Spacious 3x2 Rectangular Grid */}
              {showPlusMenu && (
                <div
                  className="absolute bottom-full mb-3 left-0 rounded-3xl bg-[#021e14]/98 border border-amber-500/35 shadow-2xl p-4 sm:p-5 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 select-none grid grid-cols-3 gap-3.5 sm:gap-4 w-[288px] sm:w-[320px] max-w-[calc(100vw-2rem)]"
                  style={{ filter: 'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.9))' }}
                >
                  {/* 1. Take Photo Camera */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setIsTakingPhoto(true);
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="Camera"
                    title="Take Photo"
                  >
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 shrink-0" strokeWidth={2.2} />
                  </button>

                  {/* 2. Photo Gallery */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="Photos"
                    title="Photo Gallery"
                  >
                    <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" strokeWidth={2.2} />
                  </button>

                  {/* 3. Camera Video Recorder */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setIsRecordingVideo(true);
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="Video"
                    title="Record Video"
                  >
                    <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" strokeWidth={2.2} />
                  </button>

                  {/* 4. Document / File */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-amber-700 to-yellow-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="Document"
                    title="Attach File"
                  >
                    <Paperclip className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" strokeWidth={2.2} />
                  </button>

                  {/* 5. Connection & Intimacy Hub */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      onOpenIntimacyHub?.();
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="Intimacy Hub"
                    title="Connection & Intimacy Hub"
                  >
                    <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0 fill-white" strokeWidth={2} />
                  </button>

                  {/* 6. Cuddle GIF */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setShowGifPicker(true);
                    }}
                    className="w-full aspect-square min-w-[64px] min-h-[64px] rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    aria-label="GIF"
                    title="Send Cuddle GIF"
                  >
                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 shrink-0" strokeWidth={2.2} />
                  </button>
                </div>
              )}
            </div>

            {/* Laptop / Desktop Direct Action Icons */}
            <div className="hidden lg:flex items-center gap-0.5 pb-1">
              {/* Memories & Milestones Vault button on Desktop */}
              {onOpenMemoriesVault && (
                <button
                  type="button"
                  onClick={onOpenMemoriesVault}
                  className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                  title="Shared Memories & Milestones Vault (Odo Nnyew Fie Kwan)"
                >
                  <AkomaIcon className="w-5 h-5 text-amber-400" strokeWidth={2.2} />
                </button>
              )}

              {/* Intimacy Hub button on Desktop */}
              {onOpenIntimacyHub && (
                <button
                  type="button"
                  onClick={onOpenIntimacyHub}
                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all"
                  title="Connection & Intimacy Hub (Daily Prompts, Bucket List, Mood Radar, Vouchers)"
                >
                  <Heart className="w-5 h-5 fill-rose-500/20" />
                </button>
              )}

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
                onClick={() => setIsRecordingVideo(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Record Video with Camera"
              >
                <Video className="w-5 h-5" />
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
            <div className={`flex-1 min-h-[42px] max-h-32 rounded-2xl bg-[#021f16] border px-3 py-2 flex items-center transition-all ${
              isUrgent
                ? 'border-amber-400 ring-2 ring-amber-400/40'
                : 'border-amber-500/25 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30'
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
                className="w-full bg-transparent resize-none text-sm text-emerald-50 placeholder-emerald-600 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Action Buttons: If text entered -> Distinctive Upward Speed Send Button. If empty -> Mic & Video Note */}
            <div className="flex items-center gap-1 pb-0.5 sm:pb-1 shrink-0">
              {text.trim() || pendingImage || pendingDocument ? (
                /* Distinctive Send Button with Modern ArrowUp Icon inside radiant gold gradient */
                <button
                  type="button"
                  onClick={handleSend}
                  className={`w-10 h-10 rounded-2xl text-slate-950 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer ${
                    isUrgent
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-600 to-amber-400 hover:from-amber-400 hover:to-yellow-300 shadow-amber-500/35 ring-2 ring-amber-400 text-white'
                      : 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 shadow-amber-500/30'
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
                    className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-amber-300 active:scale-95 border border-emerald-800/80 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                    title="Record Circular Video Note"
                    aria-label="Record Video Note"
                  >
                    <Video className="w-4.5 h-4.5" />
                  </button>

                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-amber-300 active:scale-95 border border-emerald-800/80 shadow-sm transition-all flex items-center justify-center cursor-pointer"
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
