import React, { useState } from 'react';
import { Calendar, Plus, Clock, Heart, Users, Video, Bell, Trash2, CheckCircle2, Moon, Sun, Zap, Sparkles } from 'lucide-react';
import { ScheduleEvent, UserProfile, DayScheduleStatus } from '../../types';

interface SchedulePanelProps {
  events: ScheduleEvent[];
  partners: UserProfile[];
  friends: UserProfile[];
  currentUser: UserProfile;
  onUpdateUserSchedule?: (schedule: DayScheduleStatus) => void;
  onAddEvent: (event: Omit<ScheduleEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  onClose: () => void;
}

export const SchedulePanel: React.FC<SchedulePanelProps> = ({
  events,
  partners,
  friends,
  currentUser,
  onUpdateUserSchedule,
  onAddEvent,
  onDeleteEvent,
  onClose,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'partners' | 'friends' | 'busy'>('all');

  // Daily Status state
  const [myBusy, setMyBusy] = useState(currentUser.currentSchedule?.isBusy ?? false);
  const [myActivity, setMyActivity] = useState(currentUser.currentSchedule?.activityTitle ?? 'Open & Available');
  const [myUntilTime, setMyUntilTime] = useState(currentUser.currentSchedule?.untilTime ?? '8:00 PM');
  const [statusSavedMessage, setStatusSavedMessage] = useState(false);

  // Add Event Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isBusySlot, setIsBusySlot] = useState(true);
  const [category, setCategory] = useState<ScheduleEvent['category']>('work_focus');
  const [targetGroup, setTargetGroup] = useState<ScheduleEvent['targetGroup']>('partners');

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUserSchedule) {
      onUpdateUserSchedule({
        isBusy: myBusy,
        activityTitle: myActivity.trim() || (myBusy ? 'Busy / In Focus' : 'Open & Available'),
        untilTime: myUntilTime.trim() || 'Later today'
      });
      setStatusSavedMessage(true);
      setTimeout(() => setStatusSavedMessage(false), 2500);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'busy') return e.isBusySlot;
    return e.targetGroup === filter || e.targetGroup === 'all';
  }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) return;

    let color = '#f43f5e';
    if (category === 'partner_date') color = '#f43f5e';
    if (category === 'anniversary') color = '#ec4899';
    if (category === 'work_focus') color = '#e11d48';
    if (category === 'group_call') color = '#06b6d4';
    if (category === 'hangout') color = '#10b981';
    if (category === 'sleep') color = '#6366f1';

    onAddEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      dateTime,
      endTime: endTime || undefined,
      isBusySlot,
      category,
      targetGroup,
      attendeeIds: ['user_me', ...partners.map((p) => p.id)],
      color,
      remindMinutesBefore: 30
    });

    setIsAdding(false);
    setTitle('');
    setDescription('');
    setDateTime('');
    setEndTime('');
    setIsBusySlot(true);
  };

  const getCountdown = (dateTimeStr: string) => {
    const diff = new Date(dateTimeStr).getTime() - new Date().getTime();
    if (diff < 0) return 'Past event';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `in ${days}d ${hours}h`;
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return `in ${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-rose-950/50 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Daily Schedule & Quiet Gating</h3>
              <p className="text-xs text-slate-400">Manage your day routine & notify only on emergencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Section 1: My Current Day Schedule & Status (Directly gates messaging) */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              My Current Schedule for Today
            </span>
            {statusSavedMessage && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveStatus} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMyBusy(false)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  !myBusy
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Available (Normal Ring)
              </button>

              <button
                type="button"
                onClick={() => setMyBusy(true)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  myBusy
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Busy (Silent Delivery)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Activity / Routine</label>
                <input
                  type="text"
                  value={myActivity}
                  onChange={(e) => setMyActivity(e.target.value)}
                  placeholder="e.g. Deep Work, Studio, Sleeping"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Until Time</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={myUntilTime}
                    onChange={(e) => setMyUntilTime(e.target.value)}
                    placeholder="e.g. 5:00 PM"
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                When set to <strong>Busy</strong>, friends and partners see your schedule. Normal texts arrive silently; only messages marked <strong>Urgent</strong> trigger alerts.
              </span>
            </p>
          </form>
        </div>

        {/* Filter Pills & Add Event Button */}
        <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl font-medium transition-colors ${
                filter === 'all' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilter('busy')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium transition-colors ${
                filter === 'busy' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <Moon className="w-3 h-3 text-amber-300" />
              Focus Slots
            </button>
            <button
              onClick={() => setFilter('partners')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium transition-colors ${
                filter === 'partners' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-pink-300'
              }`}
            >
              <Heart className="w-3 h-3 text-pink-400" />
              Partners
            </button>
            <button
              onClick={() => setFilter('friends')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium transition-colors ${
                filter === 'friends' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-300'
              }`}
            >
              <Users className="w-3 h-3" />
              Friends
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Day Schedule / Event
          </button>
        </div>

        {/* Add Event Form */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
            <h4 className="font-semibold text-xs text-rose-300">Schedule Day Routine / Event</h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Design Sprint Focus, Romantic Dinner, Studio Time"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ScheduleEvent['category'])}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="work_focus">Work & Deep Focus</option>
                  <option value="day_routine">Daily Routine</option>
                  <option value="partner_date">Partner Date & Cuddles 🌹</option>
                  <option value="anniversary">Anniversary / Milestone</option>
                  <option value="group_call">Group Video Call</option>
                  <option value="hangout">Friends Hangout</option>
                  <option value="sleep">Sleeping / Do Not Disturb</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Visibility</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value as ScheduleEvent['targetGroup'])}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="partners">Partners Only 💕</option>
                  <option value="friends">Friends Only</option>
                  <option value="all">Everyone</option>
                </select>
              </div>
            </div>

            {/* Busy Slot Gating Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isBusySlot"
                checked={isBusySlot}
                onChange={(e) => setIsBusySlot(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
              />
              <label htmlFor="isBusySlot" className="text-xs text-slate-200 cursor-pointer">
                Mark as <strong>Busy Period</strong> (Incoming texts delivered quietly unless marked Urgent)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow"
              >
                Save Schedule Event
              </button>
            </div>
          </form>
        )}

        {/* Events List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No schedule events in this view.
            </div>
          ) : (
            filteredEvents.map((event) => {
              const dateObj = new Date(event.dateTime);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
              });
              const formattedTime = dateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-white">{event.title}</span>
                        {event.isBusySlot && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30 flex items-center gap-1">
                            <Moon className="w-2.5 h-2.5" />
                            Busy (Quiet Gate)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-700/50">
                          {event.targetGroup === 'partners' ? '💕 Partners' : event.targetGroup === 'friends' ? '🌟 Friends' : '👥 All'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="text-slate-300">{formattedDate} at {formattedTime}</span>
                        <span>•</span>
                        <span className="text-rose-400 font-medium">{getCountdown(event.dateTime)}</span>
                      </div>

                      {event.description && (
                        <p className="text-[11px] text-slate-400 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteEvent(event.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
