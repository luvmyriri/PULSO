import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, AlertCircle, MapPin, ArrowRight } from 'lucide-react';

export default function TrackReportModal({ isOpen, onClose }) {
  const [ticketInput, setTicketInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setSearched(true);
    // Mock check for common input formats
    if (ticketInput.toUpperCase().includes('PUL') || ticketInput.toUpperCase().includes('REP') || ticketInput.length >= 3) {
      setResult({
        id: ticketInput.toUpperCase(),
        title: 'Road Surface & Asphalt Restoration',
        location: 'Camarin Road cor. Zabarte, Brgy. 174',
        status: 'In Progress',
        submittedAt: 'Today, 8:30 AM',
        estimatedFix: 'Within 24 Hours',
        currentStep: 2,
        steps: [
          { name: 'Report Received', done: true, time: '8:30 AM' },
          { name: 'Site Inspected', done: true, time: '9:45 AM' },
          { name: 'Crew Dispatched', done: true, time: '11:15 AM' },
          { name: 'Work Completed', done: false, time: 'Pending' }
        ]
      });
    } else {
      setResult(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Close tracking modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-left mb-5">
          <span className="text-[10px] font-mono-data font-bold uppercase tracking-wider text-[#ff6b00]">
            Ticket Status Lookup
          </span>
          <h3 id="track-modal-title" className="font-heading font-bold text-xl text-slate-900 dark:text-white mt-0.5">
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
              }}
              placeholder="e.g. PUL-2026-0842"
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono-data uppercase text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#ff6b00]"
              autoFocus
            />
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-bold text-xs font-heading uppercase tracking-wider transition-colors shadow-xs"
          >
            Check Live Status
          </button>
        </form>

        {/* Results Area */}
        {searched && result && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-data font-bold text-slate-500 dark:text-slate-400">
                {result.id}
              </span>
              <span className="text-[10px] font-mono-data font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300">
                {result.status}
              </span>
            </div>

            <div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
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
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {st.done ? '✓' : i + 1}
                    </span>
                    <span className={st.done ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}>
                      {st.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-data text-slate-400">{st.time}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <a
                href="/login"
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#ff6b00] hover:underline"
              >
                <span>Sign in for full history &amp; photos</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>
        )}

        {searched && !result && (
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-900 text-left">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold mb-1">
              <AlertCircle size={15} />
              <span>Reference code not found</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              Please double check the format or sign in to your resident dashboard to view all reports tied to your registered phone number.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
          Need help finding your ticket? Call <strong className="text-slate-600 dark:text-slate-300">(02) 8362-0220</strong>
        </div>

      </div>
    </div>
  );
}
