import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Plus,
  Dices,
  Sparkles,
  Heart,
  X,
  Calendar,
  Filter
} from 'lucide-react';
import { BucketListItem, BucketCategory } from '../../types/intimacy';
import {
  getLocalBucketList,
  syncBucketList,
  subscribeToBucketList
} from '../../lib/intimacyStorage';

interface BucketListViewProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  onSendMessage?: (text: string) => void;
}

export const BucketListView: React.FC<BucketListViewProps> = ({
  conversationId,
  currentUserId,
  currentUserName,
  partnerName,
  onSendMessage
}) => {
  const [items, setItems] = useState<BucketListItem[]>(() => getLocalBucketList(conversationId));
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<BucketCategory>('romantic');
  const [surpriseItem, setSurpriseItem] = useState<BucketListItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const unsub = subscribeToBucketList(conversationId, (cloudItems) => {
      setItems(cloudItems);
    });
    return () => unsub();
  }, [conversationId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (statusFilter === 'upcoming' && item.completed) return false;
      if (statusFilter === 'completed' && !item.completed) return false;
      return true;
    });
  }, [items, activeCategory, statusFilter]);

  const completedCount = useMemo(() => items.filter((i) => i.completed).length, [items]);

  const handleToggleComplete = async (item: BucketListItem) => {
    const nextCompleted = !item.completed;
    const updated = items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            completedByUserId: nextCompleted ? currentUserId : undefined
          }
        : i
    );
    setItems(updated);
    await syncBucketList(conversationId, updated);

    if (nextCompleted && onSendMessage) {
      onSendMessage(`✨ Checked off bucket list adventure: "${item.title}"! 💕`);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: BucketListItem = {
      id: `bl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCategory,
      completed: false,
      addedByUserId: currentUserId,
      addedByName: currentUserName
    };

    const updated = [newItem, ...items];
    setItems(updated);
    await syncBucketList(conversationId, updated);

    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);

    if (onSendMessage) {
      onSendMessage(`📝 Added a new bucket list date idea: "${newItem.title}"`);
    }
  };

  const handleSurpriseSpin = () => {
    const uncompleted = items.filter((i) => !i.completed);
    if (uncompleted.length === 0) return;

    setIsSpinning(true);
    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * uncompleted.length);
      setSurpriseItem(uncompleted[randomIdx]);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 100);
  };

  const categories: Array<{ id: string; label: string; icon: string }> = [
    { id: 'all', label: 'All Vibes', icon: '✨' },
    { id: 'romantic', label: 'Romantic', icon: '💖' },
    { id: 'cozy', label: 'Cozy', icon: '🕯️' },
    { id: 'adventure', label: 'Adventure', icon: '🌄' },
    { id: 'foodie', label: 'Foodie', icon: '🍷' },
    { id: 'spontaneous', label: 'Spontaneous', icon: '⚡' }
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-rose-400" />
            <span>Shared Bucket List & Date Ideas</span>
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{items.length} Total Adventures</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold tabular-nums">{completedCount} Accomplished</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSurpriseSpin}
            disabled={isSpinning || items.filter((i) => !i.completed).length === 0}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-rose-600/30 hover:from-purple-600/50 hover:to-rose-600/50 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Pick a random surprise date"
          >
            <Dices className={`w-4 h-4 text-rose-400 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>Surprise Us</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Idea</span>
          </button>
        </div>
      </div>

      {/* Surprise Date Highlight (if spun) */}
      {surpriseItem && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-rose-950/60 border border-rose-500/50 text-white flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <Sparkles className="w-5 h-5 text-rose-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                Fate Chose Tonight's Adventure!
              </span>
              <h4 className="text-sm font-bold text-white truncate">{surpriseItem.title}</h4>
              {surpriseItem.description && (
                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{surpriseItem.description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSurpriseItem(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Adventure Form Modal */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Dream Up an Adventure</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Adventure Title (e.g. Sunset Kayaking at the Bay)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              autoFocus
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional notes or details (e.g. Pack warm blankets & sparkling water)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(['romantic', 'cozy', 'adventure', 'foodie', 'spontaneous'] as BucketCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  newCategory === cat
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              Save Adventure
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Category horizontal scrolling bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Status toggle segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto shrink-0">
          {(['all', 'upcoming', 'completed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                statusFilter === s ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bucket List Items */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Compass className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs">No adventures found for this filter.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                item.completed
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleToggleComplete(item)}
                  className="mt-0.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                  aria-label={item.completed ? 'Mark uncompleted' : 'Mark completed'}
                >
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 hover:text-rose-400" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-semibold text-slate-100 ${item.completed ? 'line-through text-slate-400' : ''}`}>
                      {item.title}
                    </h4>
                    <span className="capitalize text-[10px] text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      {item.category}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                    <span>Added by {item.addedByName}</span>
                    {item.completed && item.completedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-medium">
                          Accomplished {new Date(item.completedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
