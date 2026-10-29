import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Clock, AlertCircle, MapPin, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';

export default function TrackReportModal({ isOpen, onClose }) {
  const [ticketInput, setTicketInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Lock body scroll and notify components (e.g. ScrollToTop) when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: true } }));
      document.body.setAttribute('data-updates-modal-active', 'true');
    } else {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: false } }));
      document.body.removeAttribute('data-updates-modal-active');
    }

    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: false } }));
      document.body.removeAttribute('data-updates-modal-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanTicket = ticketInput.trim().toUpperCase();
    if (!cleanTicket) return;

    setSearched(true);
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: cleanTicket,
          report_id: cleanTicket,
          tracking_token: cleanTicket,
          contact: cleanTicket,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Calculate dynamic lifecycle progress
        const rawStatus = (data.status || 'pending').toLowerCase();
        const isPending = ['pending', 'draft', 'submitted', 'needs_information'].includes(rawStatus);
        const isUnderReview = ['validated', 'pending_approval', 'approved_internal'].includes(rawStatus);
        const isInProgress = ['dispatched', 'in_progress', 'completed_pending_review'].includes(rawStatus);
        const isResolved = ['completed', 'resolved'].includes(rawStatus);

        let createdTimeStr = 'Logged';
        if (data.created_at) {
          try {
            createdTimeStr = new Date(data.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
          } catch {
            createdTimeStr = 'Logged';
          }
        }

        const steps = [
          {
            name: 'Report Received',
            done: true,
            active: false,
            time: createdTimeStr,
          },
          {
            name: 'Engineering Triage & Assessment',
            done: isUnderReview || isInProgress || isResolved,
            active: isPending,
            time: isUnderReview || isInProgress || isResolved ? 'Assessed' : 'In Review',
          },
          {
            name: 'Crew Dispatched / Field Work',
            done: isInProgress || isResolved,
            active: isUnderReview,
            time: isInProgress || isResolved ? 'Active' : 'Pending',
          },
          {
            name: 'Repairs Completed & Verified',
            done: isResolved,
            active: rawStatus === 'completed_pending_review',
            time: isResolved ? 'Verified' : 'Pending',
          },
        ];

        setResult({
          id: data.ticket_id || cleanTicket,
          category: data.category || 'Infrastructure Incident',
          title: data.description
            ? (data.description.length > 85 ? `${data.description.slice(0, 85)}...` : data.description)
            : (data.category ? `${data.category} Issue` : 'Resident Incident Report'),
          location: data.location_summary || data.location_string || (data.location_barangay ? `Barangay ${data.location_barangay}` : 'North Caloocan'),
          status: data.public_status_label || rawStatus.replace(/_/g, ' ').toUpperCase(),
          rawStatus: rawStatus,
          steps: steps,
        });
      } else {
        setResult(null);
        setErrorMsg('Reference code not found. Please verify your Ticket ID (e.g. PUL-2026-XXXX) or check your confirmation SMS.');
      }
    } catch (err) {
      console.warn('Track report network error:', err);
      setResult(null);
      setErrorMsg('Could not connect to the city registry. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-modal-title"
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto max-h-[88vh] sm:max-h-[90vh] animate-in slide-in-from-bottom duration-300 sm:duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer z-10"
          aria-label="Close tracking modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-left mb-5 pr-8 sm:pr-0">
          <h3 id="track-modal-title" className="font-heading font-bold text-xl text-slate-900 dark:text-white">
            Track your report
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter the tracking reference code sent via SMS or provided during submission.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="space-y-3 mb-5">
          <div className="relative">
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => {
                setTicketInput(e.target.value);
                setSearched(false);
                setErrorMsg(null);
              }}
              placeholder="e.g. PUL-2026-7132"
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-data uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b00]"
              autoFocus
            />
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            type="submit"
            disabled={loading || !ticketInput.trim()}
            className="w-full py-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] disabled:opacity-60 text-white font-bold text-xs font-heading uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Checking Registry...</span>
              </>
            ) : (
              <span>Check Status</span>
            )}
          </button>
        </form>

        {/* Results Area */}
        {searched && result && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 text-left space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-data font-bold text-slate-500 dark:text-slate-400">
                {result.id}
              </span>
              <span className={`inline-flex items-center text-[10px] font-mono-data font-bold px-2 py-0.5 rounded-md bg-transparent border ${
                ['resolved', 'completed'].includes(result.rawStatus)
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/80'
                  : ['in_progress', 'dispatched'].includes(result.rawStatus)
                  ? 'text-[#ea580c] border-[#ea580c]/80'
                  : 'text-amber-600 dark:text-amber-400 border-amber-500/80'
              }`}>
                {result.status}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#ea580c] block mb-0.5">
                {result.category}
              </span>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                {result.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <MapPin size={12} className="text-[#ff6b00] shrink-0" />
                <span className="truncate">{result.location}</span>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
              {result.steps.map((st, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        st.done
                          ? 'bg-emerald-500 text-white'
                          : st.active
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {st.done ? '✓' : i + 1}
                    </span>
                    <span className={st.done ? 'text-slate-900 dark:text-white font-medium' : st.active ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'}>
                      {st.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-data text-slate-400">{st.time}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to={`/track?id=${encodeURIComponent(result.id)}`}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>View Full Docket &amp; History</span>
                <ExternalLink size={12} />
              </Link>

              <Link
                to="/login"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#ff6b00] hover:underline"
              >
                <span>Sign in for full history &amp; photos</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {searched && !loading && !result && (
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-900 text-left animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold mb-1">
              <AlertCircle size={15} />
              <span>Reference code not found</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              {errorMsg || 'Please double check the format or sign in to your resident dashboard to view all reports tied to your registered phone number.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
