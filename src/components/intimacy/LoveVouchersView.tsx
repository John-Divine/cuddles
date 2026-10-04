import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  Gift,
  CheckCircle2,
  Sparkles,
  Plus,
  Heart,
  X,
  Clock,
  Send
} from 'lucide-react';
import { LoveVoucher, VoucherCategory } from '../../types/intimacy';
import {
  getLocalVouchers,
  syncVouchers,
  subscribeToVouchers
} from '../../lib/intimacyStorage';

interface LoveVouchersViewProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId?: string;
  partnerName: string;
  onSendMessage?: (text: string) => void;
}

export const LoveVouchersView: React.FC<LoveVouchersViewProps> = ({
  conversationId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  onSendMessage
}) => {
  const [vouchers, setVouchers] = useState<LoveVoucher[]>(() =>
    getLocalVouchers(conversationId, currentUserId, partnerId)
  );
  const [filter, setFilter] = useState<'available' | 'redeemed' | 'all'>('available');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<VoucherCategory>('massage');
  const [redeemingVoucher, setRedeemingVoucher] = useState<LoveVoucher | null>(null);

  useEffect(() => {
    const unsub = subscribeToVouchers(conversationId, currentUserId, partnerId, (cloudVouchers) => {
      setVouchers(cloudVouchers);
    });
    return () => unsub();
  }, [conversationId, currentUserId, partnerId]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (filter === 'available' && v.status !== 'available') return false;
      if (filter === 'redeemed' && v.status !== 'redeemed') return false;
      return true;
    });
  }, [vouchers, filter]);

  const availableCount = useMemo(() => vouchers.filter((v) => v.status === 'available').length, [vouchers]);

  const handleRedeem = async (voucher: LoveVoucher) => {
    const updated = vouchers.map((v) =>
      v.id === voucher.id
        ? {
            ...v,
            status: 'redeemed' as const,
            redeemedAt: new Date().toISOString()
          }
        : v
    );

    setVouchers(updated);
    await syncVouchers(conversationId, updated);
    setRedeemingVoucher(null);

    if (onSendMessage) {
      onSendMessage(`🎟️ Redeemed Love Voucher: "${voucher.title}"! "${voucher.description}" 💕`);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newVoucher: LoveVoucher = {
      id: `vouch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      title: newTitle.trim(),
      description: newDesc.trim() || 'A sweet personalized intimacy favor from me to you.',
      category: newCategory,
      issuerId: currentUserId,
      issuerName: currentUserName,
      recipientId: partnerId || 'partner',
      status: 'available'
    };

    const updated = [newVoucher, ...vouchers];
    setVouchers(updated);
    await syncVouchers(conversationId, updated);

    setNewTitle('');
    setNewDesc('');
    setIsCreating(false);

    if (onSendMessage) {
      onSendMessage(`🎁 Created a new Love Voucher for you: "${newVoucher.title}"!`);
    }
  };

  const categoryIcons: Record<VoucherCategory, string> = {
    massage: '💆',
    date: '🥂',
    treat: '🧁',
    cuddle: '🧸',
    favor: '✨',
    custom: '💌'
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5">
      {/* Top Banner & Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-rose-400" />
            <span>Redeemable Love Vouchers</span>
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{vouchers.length} Total Vouchers</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-400 font-semibold tabular-nums">{availableCount} Ready to Redeem</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(['available', 'redeemed', 'all'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                  filter === tab ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Voucher</span>
          </button>
        </div>
      </div>

      {/* Redeem Confirmation Prompt */}
      {redeemingVoucher && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/90 to-purple-950/90 border border-rose-500/60 text-white shadow-2xl space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{categoryIcons[redeemingVoucher.category]}</span>
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">
                  Redeem Voucher with {partnerName}?
                </span>
                <h4 className="text-sm font-bold text-white">{redeemingVoucher.title}</h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRedeemingVoucher(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-rose-200/90 leading-relaxed">
            "{redeemingVoucher.description}"
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRedeemingVoucher(null)}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleRedeem(redeemingVoucher)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white text-xs font-bold shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
            >
              Confirm & Redeem with Love 💕
            </button>
          </div>
        </div>
      )}

      {/* Create Custom Voucher Form */}
      {isCreating && (
        <form onSubmit={handleCreateVoucher} className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-rose-500/40 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Issue a Custom Love Voucher for {partnerName}
            </h4>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
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
              placeholder="Voucher Title (e.g. Free Breakfast in Bed + Fresh Coffee)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
              autoFocus
            />
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Terms of endearment / description (e.g. Made with love, pancakes with syrup anytime this weekend)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(['massage', 'cuddle', 'date', 'treat', 'favor', 'custom'] as VoucherCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize flex items-center gap-1 transition-colors cursor-pointer ${
                  newCategory === cat
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{categoryIcons[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              Gift Voucher
            </button>
          </div>
        </form>
      )}

      {/* Voucher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredVouchers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 space-y-2">
            <Ticket className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs">No vouchers matching this filter.</p>
          </div>
        ) : (
          filteredVouchers.map((v) => {
            const isRedeemed = v.status === 'redeemed';
            return (
              <div
                key={v.id}
                className={`relative rounded-3xl p-5 border transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
                  isRedeemed
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-65'
                    : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border-rose-500/30 hover:border-rose-500/50 hover:shadow-rose-950/30'
                }`}
              >
                {/* Perforated ticket edge design on left */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-r-full bg-slate-950 border-r border-t border-b border-slate-800 pointer-events-none" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-l-full bg-slate-950 border-l border-t border-b border-slate-800 pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryIcons[v.category]}</span>
                      <span className="capitalize text-[10px] text-rose-400 font-bold tracking-wider uppercase">
                        {v.category} Voucher
                      </span>
                    </div>

                    {isRedeemed ? (
                      <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Redeemed
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        Available
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{v.title}</h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{v.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500">
                    From: {v.issuerName || 'Love Token'}
                  </span>

                  {!isRedeemed ? (
                    <button
                      type="button"
                      onClick={() => setRedeemingVoucher(v)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Redeem Now</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Redeemed {v.redeemedAt ? new Date(v.redeemedAt).toLocaleDateString() : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
