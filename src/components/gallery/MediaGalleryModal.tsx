import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Film,
  Mic,
  FileText,
  Download,
  Search,
  X,
  Play,
  Pause,
  Check,
  Sparkles,
  HardDrive,
  Calendar,
  User,
  Filter
} from 'lucide-react';
import { Message, Conversation } from '../../types';
import { downloadMediaToDeviceGallery, getAllMediaFromDeviceVault, StoredMediaRecord } from '../../lib/deviceMediaStorage';

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversation?: Conversation | null;
  allConversations?: Conversation[];
  messagesMap: Record<string, Message[]>;
  onOpenVideoPlayer?: (message: Message) => void;
  initialScope?: 'all' | 'conversation';
  targetConversationId?: string | null;
}

type TabType = 'all' | 'image' | 'video' | 'voice' | 'document';

interface MediaItem {
  id: string;
  conversationId: string;
  conversationTitle?: string;
  type: 'image' | 'video' | 'video_note' | 'voice' | 'document' | 'gif';
  url: string;
  fileName: string;
  fileSize?: string;
  durationSeconds?: number;
  senderName: string;
  timestamp: string;
  createdAtISO?: string;
  isDownloadedToDevice?: boolean;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen,
  onClose,
  activeConversation,
  allConversations = [],
  messagesMap,
  onOpenVideoPlayer,
  initialScope = 'all',
  targetConversationId = null
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvFilter, setSelectedConvFilter] = useState<string>(() => {
    if (initialScope === 'conversation') {
      return targetConversationId || (activeConversation ? activeConversation.id : 'all');
    }
    return 'all';
  });
  const [vaultRecords, setVaultRecords] = useState<StoredMediaRecord[]>([]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [previewImage, setPreviewImage] = useState<MediaItem | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  // Load vault records on open and configure initial scope
  useEffect(() => {
    if (isOpen) {
      getAllMediaFromDeviceVault().then((records) => {
        setVaultRecords(records || []);
      });
      if (initialScope === 'conversation') {
        const targetId = targetConversationId || (activeConversation ? activeConversation.id : 'all');
        setSelectedConvFilter(targetId);
      } else {
        setSelectedConvFilter('all');
      }
    } else {
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
        setPlayingVoiceId(null);
      }
    }
  }, [isOpen, initialScope, activeConversation?.id, targetConversationId]);

  // Aggregate all media items from messagesMap and vault records
  const allMediaItems = useMemo(() => {
    const items: MediaItem[] = [];
    const vaultMap = new Map<string, string>();
    vaultRecords.forEach((r) => vaultMap.set(r.messageId, r.dataUrl));

    const convMap = new Map<string, Conversation>();
    allConversations.forEach((c) => convMap.set(c.id, c));

    Object.entries(messagesMap).forEach(([convId, msgs]) => {
      const conv = convMap.get(convId);
      msgs.forEach((m) => {
        const hasAttachment = !!m.attachment;
        const isMediaMsg = ['image', 'video', 'video_note', 'voice', 'document', 'gif'].includes(m.type);

        if (hasAttachment || isMediaMsg) {
          const directUrl = m.attachment?.url;
          const vaultedUrl = vaultMap.get(m.id);
          const finalUrl = directUrl || vaultedUrl || '';

          if (finalUrl) {
            const rawType = m.type as MediaItem['type'];
            items.push({
              id: m.id,
              conversationId: convId,
              conversationTitle: conv?.title || 'Direct Chat',
              type: rawType,
              url: finalUrl,
              fileName: m.attachment?.fileName || `${rawType}_${m.id.slice(-6)}`,
              fileSize: m.attachment?.fileSize,
              durationSeconds: m.attachment?.durationSeconds,
              senderName: m.senderName,
              timestamp: m.timestamp,
              createdAtISO: m.createdAtISO,
              isDownloadedToDevice: m.attachment?.isDownloadedToDevice
            });
          }
        }
      });
    });

    // Sort newest first
    return items.sort((a, b) => {
      const timeA = a.createdAtISO || a.timestamp || '';
      const timeB = b.createdAtISO || b.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messagesMap, vaultRecords, allConversations]);

  // Filter items based on active tab, search, and conversation
  const filteredItems = useMemo(() => {
    return allMediaItems.filter((item) => {
      // 1. Conversation filter
      if (selectedConvFilter !== 'all' && item.conversationId !== selectedConvFilter) {
        return false;
      }

      // 2. Tab filter
      if (activeTab === 'image' && item.type !== 'image' && item.type !== 'gif') {
        return false;
      }
      if (activeTab === 'video' && item.type !== 'video' && item.type !== 'video_note') {
        return false;
      }
      if (activeTab === 'voice' && item.type !== 'voice') {
        return false;
      }
      if (activeTab === 'document' && item.type !== 'document') {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesFile = item.fileName.toLowerCase().includes(q);
        const matchesSender = item.senderName.toLowerCase().includes(q);
        if (!matchesFile && !matchesSender) return false;
      }

      return true;
    });
  }, [allMediaItems, selectedConvFilter, activeTab, searchQuery]);

  // Counts per tab
  const counts = useMemo(() => {
    const c = { all: 0, image: 0, video: 0, voice: 0, document: 0 };
    allMediaItems.forEach((item) => {
      if (selectedConvFilter === 'all' || item.conversationId === selectedConvFilter) {
        c.all++;
        if (item.type === 'image' || item.type === 'gif') c.image++;
        if (item.type === 'video' || item.type === 'video_note') c.video++;
        if (item.type === 'voice') c.voice++;
        if (item.type === 'document') c.document++;
      }
    });
    return c;
  }, [allMediaItems, selectedConvFilter]);

  // Media counts per conversation (collection)
  const collectionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allMediaItems.forEach((item) => {
      map[item.conversationId] = (map[item.conversationId] || 0) + 1;
    });
    return map;
  }, [allMediaItems]);

  // Currently selected conversation/collection
  const currentCollection = useMemo(() => {
    if (selectedConvFilter === 'all') return null;
    return allConversations.find((c) => c.id === selectedConvFilter) || null;
  }, [selectedConvFilter, allConversations]);

  const handleDownload = async (item: MediaItem) => {
    let mime = 'application/octet-stream';
    if (item.type === 'image') mime = 'image/jpeg';
    if (item.type === 'gif') mime = 'image/gif';
    if (item.type === 'video' || item.type === 'video_note') mime = 'video/mp4';
    if (item.type === 'voice') mime = 'audio/webm';

    await downloadMediaToDeviceGallery(item.url, item.fileName, mime);
    setDownloadSuccessId(item.id);
    setTimeout(() => {
      setDownloadSuccessId(null);
    }, 2000);
  };

  const handleToggleVoice = (item: MediaItem) => {
    if (playingVoiceId === item.id) {
      audioElement?.pause();
      setPlayingVoiceId(null);
      setAudioElement(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(item.url);
      audio.onended = () => {
        setPlayingVoiceId(null);
        setAudioElement(null);
      };
      audio.play().catch(console.warn);
      setAudioElement(audio);
      setPlayingVoiceId(item.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="shrink-0 p-4 sm:px-6 bg-slate-900/98 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/20 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white truncate">
                  {currentCollection ? `${currentCollection.title} Collection` : 'All Media Collections'}
                </h3>
                {currentCollection ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1 shrink-0">
                    Collection View
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <HardDrive className="w-3 h-3" />
                    All Sanctuary Media
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {currentCollection
                  ? `Showing all ${filteredItems.length} media items in ${currentCollection.title}'s collection`
                  : `Showing all ${allMediaItems.length} items across all conversations & offline vault`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentCollection ? (
              <button
                type="button"
                onClick={() => setSelectedConvFilter('all')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                title="View All Media across all collections"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Show All Collections</span>
              </button>
            ) : activeConversation ? (
              <button
                type="button"
                onClick={() => setSelectedConvFilter(activeConversation.id)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-semibold text-pink-300 hover:text-pink-200 transition-colors cursor-pointer"
                title={`View ${activeConversation.title}'s Collection`}
              >
                <span>📁</span>
                <span>{activeConversation.title} Collection</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collection Selector Chips Row */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold shrink-0 pr-1.5 border-r border-slate-800">
            <Filter className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400 hidden sm:inline">Collections:</span>
          </div>

          {/* All Collections Chip */}
          <button
            type="button"
            onClick={() => setSelectedConvFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedConvFilter === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>✨ All Media</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedConvFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {allMediaItems.length}
            </span>
          </button>

          {/* Conversation Collection Chips */}
          {allConversations.map((c) => {
            const count = collectionCounts[c.id] || 0;
            const isSelected = selectedConvFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConvFilter(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 ring-1 ring-pink-400'
                    : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <span>📁</span>
                <span className="truncate max-w-[120px]">{c.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="shrink-0 p-3 sm:px-6 bg-slate-900/60 border-b border-slate-800/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: 'all' as TabType, label: 'All', count: counts.all, icon: Sparkles },
              { id: 'image' as TabType, label: 'Photos', count: counts.image, icon: ImageIcon },
              { id: 'video' as TabType, label: 'Videos & Notes', count: counts.video, icon: Film },
              { id: 'voice' as TabType, label: 'Voice Memos', count: counts.voice, icon: Mic },
              { id: 'document' as TabType, label: 'Documents', count: counts.document, icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or sender..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">No media found</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {searchQuery
                    ? 'No media matches your search query. Try another keyword.'
                    : 'Start sharing photos, recording voice notes, or sending video moments to build your private sanctuary gallery!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredItems.map((item) => {
                const isImage = item.type === 'image' || item.type === 'gif';
                const isVideo = item.type === 'video' || item.type === 'video_note';
                const isVoice = item.type === 'voice';
                const isDoc = item.type === 'document';
                const isPlaying = playingVoiceId === item.id;
                const isJustDownloaded = downloadSuccessId === item.id;

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl bg-slate-800/70 border border-slate-700/60 overflow-hidden flex flex-col hover:border-rose-500/50 transition-all shadow-md"
                  >
                    {/* Media Preview Box */}
                    <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                      {isImage && (
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => setPreviewImage(item)}
                        />
                      )}

                      {isVideo && (
                        <div
                          className="relative w-full h-full flex items-center justify-center cursor-pointer group/vid"
                          onClick={() => {
                            if (onOpenVideoPlayer) {
                              onOpenVideoPlayer({
                                id: item.id,
                                conversationId: item.conversationId,
                                senderId: '',
                                senderName: item.senderName,
                                senderAvatar: '',
                                status: 'delivered',
                                text: '',
                                timestamp: item.timestamp,
                                type: item.type,
                                attachment: {
                                  type: item.type,
                                  url: item.url,
                                  fileName: item.fileName,
                                  durationSeconds: item.durationSeconds
                                }
                              });
                            }
                          }}
                        >
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover/vid:bg-black/20 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                              <Play className="w-4 h-4 ml-0.5 fill-white" />
                            </div>
                          </div>
                          {item.durationSeconds && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-white">
                              0:{Math.floor(item.durationSeconds).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      )}

                      {isVoice && (
                        <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-tr from-slate-900 to-indigo-950/60">
                          <button
                            type="button"
                            onClick={() => handleToggleVoice(item)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform cursor-pointer ${
                              isPlaying ? 'bg-amber-500 scale-105 animate-pulse' : 'bg-indigo-600 hover:scale-105'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
                          </button>
                          <span className="text-[11px] font-mono text-indigo-300">
                            {item.durationSeconds ? `0:${Math.floor(item.durationSeconds).toString().padStart(2, '0')}` : 'Voice Memo'}
                          </span>
                        </div>
                      )}

                      {isDoc && (
                        <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-tr from-slate-900 to-slate-800">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-[11px] text-slate-300 font-bold truncate max-w-[120px] px-1">
                            {item.fileName}
                          </span>
                          {item.fileSize && (
                            <span className="text-[10px] text-slate-500">{item.fileSize}</span>
                          )}
                        </div>
                      )}

                      {/* Download Floating Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-xl text-white shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                          isJustDownloaded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-black/60 hover:bg-rose-600 text-slate-200'
                        }`}
                        title="Save to Device / Download"
                      >
                        {isJustDownloaded ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200 truncate pr-1" title={item.fileName}>
                          {item.fileName}
                        </span>
                      </div>

                      {/* Collection indicator if in All view */}
                      {selectedConvFilter === 'all' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConvFilter(item.conversationId);
                          }}
                          className="text-[10px] text-pink-400 hover:text-pink-300 font-semibold truncate max-w-full text-left flex items-center gap-1 cursor-pointer"
                          title={`Filter to ${item.conversationTitle} collection`}
                        >
                          <span>📁</span>
                          <span className="truncate">{item.conversationTitle}</span>
                        </button>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[80px]">{item.senderName}</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="shrink-0 p-3 sm:px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredItems.length}</strong> items in gallery
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            All files are stored on your local device vault and remain available offline.
          </span>
        </div>
      </div>

      {/* Fullscreen Photo Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(previewImage);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Save to Device</span>
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <img
            src={previewImage.url}
            alt={previewImage.fileName}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-white">{previewImage.fileName}</p>
            <p className="text-xs text-slate-400">
              Shared by {previewImage.senderName} • {previewImage.timestamp}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
