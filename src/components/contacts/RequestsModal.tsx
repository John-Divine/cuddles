import React, { useState } from 'react';
import {
  Bell,
  Heart,
  Users,
  Check,
  X,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { ContactRequest, UserAccount } from '../../types';
import { updateContactRequestStatusInFirestore } from '../../lib/firebase';

interface RequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  requests: ContactRequest[];
  onAcceptRequest: (request: ContactRequest) => void;
  onDeclineRequest: (request: ContactRequest) => void;
}

export const RequestsModal: React.FC<RequestsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  requests,
  onAcceptRequest,
  onDeclineRequest
}) => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanCurrentUsername = (currentUser.username || '').toLowerCase().trim().replace(/^@/, '');

  const incomingRequests = requests.filter(
    (r) =>
      r.status === 'pending' &&
      (r.receiverId === currentUser.id ||
        ((r.receiverUsername || '').toLowerCase().trim().replace(/^@/, '') === cleanCurrentUsername))
  );

  const outgoingRequests = requests.filter(
    (r) => r.senderId === currentUser.id
  );

  const handleAccept = async (req: ContactRequest) => {
    setProcessingId(req.id);
    try {
      await updateContactRequestStatusInFirestore(req.id, 'accepted');
      onAcceptRequest(req);
    } catch (err) {
      console.warn('Error accepting request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (req: ContactRequest) => {
    setProcessingId(req.id);
    try {
      await updateContactRequestStatusInFirestore(req.id, 'declined');
      onDeclineRequest(req);
    } catch (err) {
      console.warn('Error declining request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-md shadow-rose-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Contact Requests</h3>
                {incomingRequests.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/30 animate-pulse">
                    {incomingRequests.length} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Accept or review connection invitations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 pt-3 pb-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'incoming'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Incoming ({incomingRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'outgoing'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>Sent by You ({outgoingRequests.length})</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {activeTab === 'incoming' && (
            <>
              {incomingRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-medium text-slate-400">No pending incoming requests.</p>
                  <p className="text-[11px] text-slate-600">
                    Share your username <strong className="text-rose-400 font-mono">@{currentUser.username}</strong> with your partner or friends so they can add you!
                  </p>
                </div>
              ) : (
                incomingRequests.map((req) => {
                  const isPartner = req.relationshipType === 'partner';
                  const isBusy = processingId === req.id;

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={req.senderAvatar}
                          alt={req.senderName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-400/80 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-white truncate">{req.senderName}</h4>
                            <span className="text-[10px] text-rose-400 font-mono">@{req.senderUsername}</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isPartner
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {isPartner ? (
                                <>
                                  <Heart className="w-3 h-3 text-rose-400 fill-rose-400/50" />
                                  <span>Partner Sanctuary</span>
                                </>
                              ) : (
                                <>
                                  <Users className="w-3 h-3 text-indigo-400" />
                                  <span>Friend</span>
                                </>
                              )}
                            </span>
                            {req.partnerNickname && (
                              <span className="text-[11px] text-slate-400 italic">
                                "{req.partnerNickname}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDecline(req)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAccept(req)}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/25 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'outgoing' && (
            <>
              {outgoingRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  You haven't sent any pending contact requests yet.
                </div>
              ) : (
                outgoingRequests.map((req) => {
                  const isAccepted = req.status === 'accepted';
                  const isDeclined = req.status === 'declined';
                  const isPending = req.status === 'pending';

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">To:</span>
                          <span className="text-xs font-bold text-rose-400 font-mono">@{req.receiverUsername}</span>
                          <span className="text-[10px] text-slate-400">({req.relationshipType})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Sent on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <X className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
