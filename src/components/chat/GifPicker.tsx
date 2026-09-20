import React, { useState } from 'react';
import { Search, X, Sparkles, Heart, Laugh, PartyPopper } from 'lucide-react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'love', label: 'Love & Romance', icon: Heart },
  { id: 'reactions', label: 'Reactions', icon: Sparkles },
  { id: 'funny', label: 'Laughs', icon: Laugh },
  { id: 'celebrate', label: 'Cheers', icon: PartyPopper }
];

const GIF_DATABASE: Record<string, { url: string; title: string }[]> = {
  love: [
    { url: 'https://media.giphy.com/media/26BRv0ThflsDTjDUs/giphy.gif', title: 'Heart explosion' },
    { url: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif', title: 'Warm hug' },
    { url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', title: 'Blowing kiss' },
    { url: 'https://media.giphy.com/media/MeIucajx7YeLA2lfnd/giphy.gif', title: 'Love you' },
    { url: 'https://media.giphy.com/media/26BRv0ThflsDTjDUs/giphy.gif', title: 'Infinite hearts' },
    { url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', title: 'Cute cat cuddle' }
  ],
  reactions: [
    { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', title: 'Mind blown' },
    { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', title: 'Nodding yes' },
    { url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', title: 'Shocked blink' },
    { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', title: 'Excited dancing' }
  ],
  funny: [
    { url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', title: 'Rolling on floor laughing' },
    { url: 'https://media.giphy.com/media/xUA7aM09ByyR1w5gCG/giphy.gif', title: 'Giggle' },
    { url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', title: 'Dog grin' }
  ],
  celebrate: [
    { url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', title: 'Party confetti' },
    { url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', title: 'Toast celebration' },
    { url: 'https://media.giphy.com/media/lMameLIF8ymWxGLGHdl/giphy.gif', title: 'Cheers' }
  ]
};

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState('love');
  const [query, setQuery] = useState('');

  const currentGifs = GIF_DATABASE[activeTab] || GIF_DATABASE.love;
  const filtered = query.trim()
    ? Object.values(GIF_DATABASE).flat().filter(g => g.title.toLowerCase().includes(query.toLowerCase()))
    : currentGifs;

  return (
    <div className="absolute bottom-16 left-2 right-2 sm:left-auto sm:right-4 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 text-slate-100 z-50 backdrop-blur-xl animate-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Choose a GIF
        </span>
        <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-2">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search expressions, hugs, love..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Categories (vertical wrapping, no horizontal scroll) */}
      {!query && (
        <div className="flex flex-wrap gap-1.5 py-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* GIF Grid */}
      <div className="grid grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto pr-1">
        {filtered.map((gif, index) => (
          <div
            key={index}
            onClick={() => onSelect(gif.url)}
            className="group relative aspect-video rounded-xl overflow-hidden bg-slate-800 cursor-pointer border border-slate-700/60 hover:border-indigo-500 transition-all hover:scale-[1.02]"
          >
            <img
              src={gif.url}
              alt={gif.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
              <span className="text-[10px] text-white font-medium truncate">{gif.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
