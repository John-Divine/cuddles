import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  Heart,
  Plus,
  X,
  MapPin,
  Star,
  Clock,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Gift,
  Flame,
  ChevronRight,
  Filter
} from 'lucide-react';
import { CoupleMemory, CoupleMilestone, MemoryCategory, MilestoneCategory } from '../../types/memories';
import {
  subscribeToMemories,
  subscribeToMilestones,
  saveCoupleMemory,
  deleteCoupleMemory,
  toggleMemoryFavorite,
  saveCoupleMilestone,
  toggleMilestoneCompleted,
  getRelationshipStartDate,
  setRelationshipStartDate,
  calculateRelationshipStats
} from '../../lib/memoriesStorage';
import {
  AkomaIcon,
  OdoNnyewFieKwanIcon,
  OsramNeNsorommaIcon,
  AfricanGeometricDivider
} from '../common/AdinkraIcons';

interface MemoriesTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle?: string;
  currentUserId: string;
  currentUserName: string;
  partnerName?: string;
  onShareToChat?: (text: string) => void;
}

export const MemoriesTimelineModal: React.FC<MemoriesTimelineModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationTitle = 'Us',
  currentUserId,
  currentUserName,
  partnerName = 'Love',
  onShareToChat
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'milestones'>('timeline');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all' | 'favorites'>('all');
  const [memories, setMemories] = useState<CoupleMemory[]>([]);
  const [milestones, setMilestones] = useState<CoupleMilestone[]>([]);
  const [startDate, setStartDateState] = useState<string>(() => getRelationshipStartDate(conversationId));
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);

  // Add memory modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState<MemoryCategory>('romantic');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPartnerReflection, setNewPartnerReflection] = useState('');
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add milestone modal state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneCategory, setNewMilestoneCategory] = useState<MilestoneCategory>('anniversary');
  const [newMilestoneRitual, setNewMilestoneRitual] = useState('');

  // Subscribe to memories & milestones
  useEffect(() => {
    if (!isOpen) return;
    const unsubMems = subscribeToMemories(conversationId, setMemories);
    const unsubMils = subscribeToMilestones(conversationId, setMilestones);
    return () => {
      unsubMems();
      unsubMils();
    };
  }, [isOpen, conversationId]);

  // Calculate live relationship stats
  const stats = useMemo(() => {
    return calculateRelationshipStats(startDate, memories, milestones);
  }, [startDate, memories, milestones]);

  // Filtered memories list
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (categoryFilter === 'favorites') return m.favorite;
      if (categoryFilter !== 'all') return m.category === categoryFilter;
      return true;
    });
  }, [memories, categoryFilter]);

  if (!isOpen) return null;

  const handleSaveStartDate = () => {
    if (tempStartDate) {
      setRelationshipStartDate(conversationId, tempStartDate);
      setStartDateState(tempStartDate);
      setIsEditingStartDate(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMem: CoupleMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      title: newTitle.trim(),
      date: newDate,
      category: newCategory,
      location: newLocation.trim() || undefined,
      description: newDescription.trim() || undefined,
      partnerReflection: newPartnerReflection.trim() || undefined,
      imageUrl: newImagePreview || undefined,
      addedByUserId: currentUserId,
      addedByUserName: currentUserName,
      createdAt: new Date().toISOString(),
      favorite: false
    };

    await saveCoupleMemory(newMem);

    // Optionally share notification to chat
    if (onShareToChat) {
      onShareToChat(`✨ New Couple Memory added to our Vault: "${newMem.title}" (${newMem.date}) 💕`);
    }

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewLocation('');
    setNewPartnerReflection('');
    setNewImagePreview(null);
    setShowAddModal(false);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneDate) return;

    const newMil: CoupleMilestone = {
      id: `mil_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newMilestoneTitle.trim(),
      targetDate: newMilestoneDate,
      category: newMilestoneCategory,
      ritualIdea: newMilestoneRitual.trim() || undefined,
      completed: false
    };

    await saveCoupleMilestone(conversationId, newMil);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setNewMilestoneRitual('');
    setShowAddMilestone(false);
  };

  const getCategoryBadgeClass = (category: MemoryCategory) => {
    switch (category) {
      case 'first_date':
        return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
      case 'romantic':
        return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
      case 'travel':
        return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
      case 'celebration':
        return 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10';
      case 'milestone':
        return 'text-amber-400 border-amber-400/40 bg-amber-400/15 font-semibold';
      default:
        return 'text-emerald-200 border-emerald-500/20 bg-emerald-500/10';
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 p-0 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shared Memories and Milestones Vault"
    >
      {/* Main Luxury Emerald & Gold Card Container */}
      <div className="w-full max-w-4xl h-full sm:h-[92vh] sm:max-h-[850px] bg-gradient-to-b from-[#021a12] via-[#032218] to-[#01140e] border border-amber-500/35 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-emerald-50 relative">
        {/* Subtle African Gold Geometric Corner Accents */}
        <div className="absolute top-2 left-2 text-amber-500/30 pointer-events-none select-none">
          <OdoNnyewFieKwanIcon className="w-10 h-10 opacity-20" color="#f59e0b" />
        </div>
        <div className="absolute top-2 right-12 text-amber-500/30 pointer-events-none select-none">
          <AkomaIcon className="w-10 h-10 opacity-20" color="#f59e0b" />
        </div>

        {/* Modal Top Bar */}
        <header className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-amber-500/25 bg-emerald-950/90 flex items-center justify-between gap-3 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#021a12] flex items-center justify-center">
                <AkomaIcon className="w-6 h-6" color="#fbbf24" strokeWidth={2.4} />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 truncate flex items-center gap-2">
                <span>Shared Memories & Milestones</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-300/80 truncate flex items-center gap-1.5">
                <OdoNnyewFieKwanIcon className="w-3.5 h-3.5 shrink-0" color="#fbbf24" />
                <span>Odo Nnyew Fie Kwan • Love never loses its way home</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-400 hover:text-amber-300 hover:bg-emerald-900/60 border border-emerald-800/60 active:scale-95 transition-all cursor-pointer"
              title="Close Vault"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Hero Relationship Counter Banner */}
        <div className="shrink-0 px-4 sm:px-6 py-4 bg-gradient-to-r from-[#032319] via-[#063f2e] to-[#032319] border-b border-amber-500/20 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Left: Days Together in Love */}
            <div className="flex items-center gap-4 bg-[#011710]/70 p-3.5 sm:p-4 rounded-2xl border border-amber-500/25 backdrop-blur-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/30 border border-amber-400/40 flex flex-col items-center justify-center shrink-0 text-amber-300 shadow-inner">
                <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/90 mt-0.5">Days</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-300 tabular-nums">
                    {stats.daysTogether}
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">Radiant Days in Love</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-200/70">
                  <span>Since {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <button
                    onClick={() => {
                      setTempStartDate(startDate);
                      setIsEditingStartDate(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Edit date
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Upcoming Milestone Countdown */}
            <div className="flex items-center gap-4 bg-[#011710]/70 p-3.5 sm:p-4 rounded-2xl border border-amber-500/25 backdrop-blur-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-emerald-400/30 border border-emerald-400/40 flex flex-col items-center justify-center shrink-0 text-emerald-300 shadow-inner">
                <Calendar className="w-6 h-6 text-emerald-300" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/90 mt-0.5">Next</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
                    {stats.daysToNextMilestone}
                  </span>
                  <span className="text-xs text-emerald-200 font-medium truncate">
                    days until <strong className="text-white font-semibold">{stats.nextMilestoneTitle}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/70 truncate mt-0.5">
                  Target date: {stats.nextMilestoneDate || 'Upcoming celebration'}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Start Date Popover */}
          {isEditingStartDate && (
            <div className="mt-3 p-3 rounded-xl bg-[#021a12] border border-amber-500/40 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-amber-200 font-medium">When did your journey begin?</span>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="px-2.5 py-1 bg-emerald-950 border border-amber-500/30 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleSaveStartDate}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:opacity-90 active:scale-95 transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingStartDate(false)}
                className="text-xs text-emerald-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Tab & Sub-navigation Row */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-900 flex items-center justify-between gap-3 flex-wrap">
          {/* Main Views (Timeline vs Milestones) */}
          <div className="flex items-center gap-1.5 p-1 bg-emerald-900/50 rounded-xl border border-emerald-800/60">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-800/40'
              }`}
            >
              <AkomaIcon className="w-4 h-4" />
              <span>Memories Stream ({memories.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'milestones'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-800/40'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Milestones & Anniversaries ({milestones.length})</span>
            </button>
          </div>

          {/* Action Button */}
          {activeTab === 'timeline' ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Memory</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddMilestone(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Milestone</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips for Timeline View */}
        {activeTab === 'timeline' && (
          <div className="shrink-0 px-4 sm:px-6 py-2 bg-[#021710] border-b border-emerald-900/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" />
              Filter:
            </span>
            {(
              [
                { id: 'all', label: 'All Memories' },
                { id: 'favorites', label: '★ Favorites' },
                { id: 'romantic', label: 'Romantic' },
                { id: 'first_date', label: 'First Moments' },
                { id: 'milestone', label: 'Milestones' },
                { id: 'travel', label: 'Adventures & Trips' },
                { id: 'celebration', label: 'Celebrations' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  categoryFilter === tab.id
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'timeline' ? (
            /* Timeline Stream View */
            filteredMemories.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-900/40 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
                  <AkomaIcon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-amber-200">No memories in this view yet</h3>
                <p className="text-xs text-emerald-300/70 max-w-sm mx-auto">
                  Every shared sunset, deep conversation, and sweet milestone belongs here. Record your first sacred memory together.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs active:scale-95 transition-all shadow-md inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Memory</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMemories.map((mem) => (
                  <article
                    key={mem.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#021f16]/90 border border-amber-500/30 hover:border-amber-400/50 shadow-xl transition-all relative overflow-hidden group"
                  >
                    {/* Top Row: Date, Category badge, and Favorite */}
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 bg-amber-500/15 border-amber-500/30 text-amber-300">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{new Date(mem.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${getCategoryBadgeClass(mem.category)}`}>
                          {mem.category.replace('_', ' ')}
                        </span>
                        {mem.location && (
                          <span className="text-[11px] text-emerald-300/70 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400/80" />
                            <span>{mem.location}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleMemoryFavorite(conversationId, mem.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            mem.favorite ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-600 hover:text-amber-300'
                          }`}
                          title={mem.favorite ? 'Remove from favorites' : 'Mark as favorite'}
                        >
                          <Star className={`w-4 h-4 ${mem.favorite ? 'fill-amber-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this memory?')) {
                              deleteCoupleMemory(conversationId, mem.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-emerald-700 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                      {mem.title}
                    </h3>

                    {/* Image if present */}
                    {mem.imageUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-amber-500/25 max-h-80 bg-black/40">
                        <img
                          src={mem.imageUrl}
                          alt={mem.title}
                          className="w-full h-auto object-cover max-h-80 hover:scale-[1.01] transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Story / Description */}
                    {mem.description && (
                      <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mb-3">
                        {mem.description}
                      </p>
                    )}

                    {/* Sacred Partner Reflection Callout with Akoma Icon */}
                    {mem.partnerReflection && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/90 via-[#03291d] to-emerald-950/90 border border-amber-500/30 flex items-start gap-2.5">
                        <AkomaIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" strokeWidth={2.2} />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                            Sacred Heart Reflection
                          </span>
                          <p className="text-xs italic text-amber-100/90 mt-0.5">
                            "{mem.partnerReflection}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer metadata */}
                    <div className="mt-3 pt-2 border-t border-emerald-900/60 flex items-center justify-between text-[10px] text-emerald-400/60">
                      <span>Logged with devotion by {mem.addedByUserName}</span>
                      {onShareToChat && (
                        <button
                          type="button"
                          onClick={() => onShareToChat(`💕 Remembering: "${mem.title}" on ${mem.date}`)}
                          className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          Send to Chat
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            /* Milestones & Anniversaries View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#032319] via-[#043324] to-[#032319] border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                    <OsramNeNsorommaIcon className="w-6 h-6" color="#fbbf24" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-amber-200">Relationship Journey & Anniversaries</h3>
                    <p className="text-xs text-emerald-300/70">
                      Honoring every milestone with love rituals and cultural gift traditions
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      milestone.completed
                        ? 'bg-[#021810]/70 border-emerald-700/60 opacity-90'
                        : 'bg-[#022218]/95 border-amber-500/40 shadow-lg'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMilestoneCompleted(conversationId, milestone.id)}
                            className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                            title={milestone.completed ? 'Mark uncompleted' : 'Mark completed'}
                          >
                            {milestone.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-amber-400/70" />
                            )}
                          </button>
                          <h4
                            className={`font-bold text-sm truncate ${
                              milestone.completed ? 'line-through text-emerald-300/60' : 'text-white'
                            }`}
                          >
                            {milestone.title}
                          </h4>
                        </div>
                        <p className="text-xs text-amber-300/80 font-medium ml-7 mt-0.5">
                          Target Date: {new Date(milestone.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shrink-0">
                        {milestone.category}
                      </span>
                    </div>

                    {/* Ritual Idea if present */}
                    {milestone.ritualIdea && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/70 border border-amber-500/20 text-xs ml-7">
                        <span className="font-semibold text-amber-300 block mb-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Celebration Ritual:
                        </span>
                        <p className="text-emerald-100/80">{milestone.ritualIdea}</p>
                      </div>
                    )}

                    {/* Gift recommendation if present */}
                    {milestone.giftRecommendation && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] ml-7 text-amber-200/90 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span><strong>Tradition Guide:</strong> {milestone.giftRecommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* African Geometric Decorative Footer Accent */}
        <div className="shrink-0 px-6 py-1.5 bg-[#01140e] border-t border-amber-500/20 flex items-center justify-center">
          <AfricanGeometricDivider className="w-48 h-2" />
        </div>
      </div>

      {/* Record New Memory Sub-Modal */}
      {showAddModal && (
        <div
          className="absolute inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg bg-gradient-to-b from-[#021e14] via-[#03261a] to-[#01140e] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-emerald-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2">
                <AkomaIcon className="w-6 h-6 text-amber-400" />
                <h3 className="font-bold text-base text-amber-200">Record a Couple Memory</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Memory Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Rooftop Stargazing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white placeholder-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-amber-200 block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-200 block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                  >
                    <option value="romantic">Romantic Moment</option>
                    <option value="first_date">First Moments</option>
                    <option value="milestone">Big Milestone</option>
                    <option value="travel">Adventures & Travel</option>
                    <option value="celebration">Celebrations & Feasts</option>
                    <option value="spontaneous">Spontaneous Joy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunset Cliffs / Our Favorite Balcony"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white placeholder-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Story & What Happened
                </label>
                <textarea
                  rows={3}
                  placeholder="Write the intimate details of this moment..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white placeholder-emerald-600 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Sacred Heart Reflection (Love Note to Partner)
                </label>
                <input
                  type="text"
                  placeholder="e.g. I knew right here that you were my destiny."
                  value={newPartnerReflection}
                  onChange={(e) => setNewPartnerReflection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-amber-500/30 focus:border-amber-400 text-sm text-amber-100 placeholder-emerald-700 focus:outline-none"
                />
              </div>

              {/* Photo Upload Attachment */}
              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Photo Attachment
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {newImagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-500/30 max-h-40">
                    <img src={newImagePreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewImagePreview(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-emerald-700 hover:border-amber-400 bg-emerald-950/40 text-emerald-300 hover:text-amber-300 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Upload a photo from your device</span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  Save to Sacred Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Milestone Modal */}
      {showAddMilestone && (
        <div
          className="absolute inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddMilestone(false)}
        >
          <div
            className="w-full max-w-md bg-gradient-to-b from-[#021e14] via-[#03261a] to-[#01140e] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-emerald-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-amber-200">Add Milestone or Anniversary</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                className="p-1 rounded-lg text-emerald-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trip to Zanzibar"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  required
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Category
                </label>
                <select
                  value={newMilestoneCategory}
                  onChange={(e) => setNewMilestoneCategory(e.target.value as MilestoneCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                >
                  <option value="anniversary">Anniversary</option>
                  <option value="first_date">First Date Remembrance</option>
                  <option value="first_trip">Travel & Adventure</option>
                  <option value="first_kiss">First Kiss</option>
                  <option value="wedding">Sacred Union</option>
                  <option value="custom">Custom Special Date</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-200 block mb-1">
                  Ritual / Celebration Idea (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Recreate our favorite dinner"
                  value={newMilestoneRitual}
                  onChange={(e) => setNewMilestoneRitual(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 focus:border-amber-400 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-2 rounded-xl text-xs text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
