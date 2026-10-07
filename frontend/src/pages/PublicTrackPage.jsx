import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, ShieldCheck, MapPin, CheckCircle2, 
  AlertTriangle, UserPlus, 
  Calendar, Loader2, Activity 
} from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken } from '../utils/authSession';
import { formatFullAddress, parseAddressString } from '../utils/philippineAddress';
import WizardHeader from '../components/report-wizard/WizardHeader';
import PulsoPulseLine from '../components/common/PulsoPulseLine';

const LIFECYCLE_STAGES = [
  { id: 'received', key: 'received', defaultLabel: 'Received', defaultDesc: 'Report logged and queued for engineering triage.' },
  { id: 'under_review', key: 'under_review', defaultLabel: 'Under Review', defaultDesc: 'Dispatch engineers verifying jurisdiction and field requirements.' },
  { id: 'validated', key: 'validated', defaultLabel: 'Validated', defaultDesc: 'Issue confirmed and work order authorized.' },
  { id: 'assigned', key: 'assigned', defaultLabel: 'Assigned', defaultDesc: 'Work order dispatched to District Maintenance Crew.' },
  { id: 'in_progress', key: 'in_progress', defaultLabel: 'In Progress', defaultDesc: 'Field team actively conducting on-site repairs.' },
  { id: 'resolved', key: 'resolved', defaultLabel: 'Resolved', defaultDesc: 'Repairs completed and verified with on-site proof.' },
];

export default function PublicTrackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [ticketId, setTicketId] = useState(searchParams.get('id') || '');
  const [trackingToken, setTrackingToken] = useState(searchParams.get('token') || searchParams.get('code') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [replyError, setReplyError] = useState(null);

  const fetchTrackStatus = useCallback(async (id, token) => {
    if (!id) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: id,
          report_id: id,
          tracking_token: token,
          contact: token,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        setReportData(null);
        if (response.status === 404 || response.status === 403) {
          setErrorMsg(t('track.lookup.errorNotFound', 'Report not found or invalid tracking credentials. Please check your Ticket ID and Tracking Token or Contact Number.'));
        } else {
          setErrorMsg('Unable to retrieve tracking record. Please try again.');
        }
      }
    } catch (err) {
      console.warn('Track lookup network error:', err);
      setReportData(null);
      setErrorMsg(t('track.lookup.networkError', 'Could not reach the civic registry. Check your connection and try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const idParam = searchParams.get('id');
    const tokenParam = searchParams.get('token') || searchParams.get('code');
    if (idParam) {
      setTicketId(idParam);
      if (tokenParam) setTrackingToken(tokenParam);
      fetchTrackStatus(idParam, tokenParam || '');
    }
  }, [searchParams, fetchTrackStatus]);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    fetchTrackStatus(ticketId.trim(), trackingToken.trim());
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();
    const message = replyText.trim();
    if (message.length < 10 || !reportData) return;
    setReplyLoading(true);
    setReplyError(null);
    setReplyMessage(null);
    try {
      const authToken = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/reports/information-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          ticket_id: reportData.ticket_id,
          tracking_token: trackingToken.trim(),
          message,
        }),
      });
      if (!response.ok) {
        setReplyError(response.status === 404
          ? t('track.reply.credentialsError', 'Sign in as the report owner or enter the secret tracking token to send information.')
          : t('track.reply.sendError', 'Your information was not recorded. Review the report status and try again.'));
        return;
      }
      const result = await response.json();
      setReportData((current) => current ? { ...current, status: result.status } : current);
      setReplyText('');
      setReplyMessage(t('track.reply.success', 'Your information was recorded for engineering review.'));
      if (trackingToken.trim()) await fetchTrackStatus(reportData.ticket_id, trackingToken.trim());
    } catch {
      setReplyError(t('track.reply.networkError', 'Could not send your information. Check your connection and try again.'));
    } finally {
      setReplyLoading(false);
    }
  };

  // Determine current active stage index
  const currentStageId = ({
    pending: 'received', unverified: 'received', needs_information: 'under_review',
    under_review: 'under_review', pending_approval: 'under_review',
    approved_internal: 'validated', dispatched: 'assigned',
    completed_pending_review: 'in_progress',
  })[(reportData?.status || '').toLowerCase()] || (reportData?.status || 'received').toLowerCase().replace(' ', '_');
  let currentStageIndex = LIFECYCLE_STAGES.findIndex(s => s.id === currentStageId);
  if (currentStageIndex === -1) currentStageIndex = 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <WizardHeader currentStep={1} totalSteps={1} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity size={14} className="text-orange-600" />
            <span>{t('track.header.badge', 'Civic Aperture · Transparent Public Works')}</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-slate-900 dark:text-white">
            {t('track.header.title', 'Track Public Infrastructure Report')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {t('track.header.subtitle', 'Read the latest recorded status and public timeline for your Caloocan City ticket.')}
          </p>
        </div>

        {/* ── LOOKUP FORM ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleLookupSubmit} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="track-ticket-id" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {t('track.lookup.ticketLabel', 'Ticket ID')}
              </label>
              <input
                id="track-ticket-id"
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder={t('track.lookup.ticketPlaceholder', 'e.g. RPT-20260902-8F92E1B4 or PULSO-10492')}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              />
            </div>

            <div>
              <label htmlFor="track-token" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {t('track.lookup.tokenLabel', 'Tracking Code OR Contact (Phone / Email)')}
              </label>
              <input
                id="track-token"
                type="text"
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                placeholder={t('track.lookup.tokenPlaceholder', 'TRK-XXXX-XXXX or 0917XXXXXXX or name@email.com')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || !ticketId.trim()}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>{isLoading ? t('track.lookup.searching', 'Searching Civic Registry...') : t('track.lookup.submitBtn', 'Track Report')}</span>
            </button>
          </div>
        </form>

        {/* ── CIVIC PULSE LOADING INDICATOR ─────────────────────────────────── */}
        {isLoading && (
          <div className="py-6 flex flex-col items-center justify-center gap-2.5 animate-fadeIn" role="status" aria-live="polite">
            <div className="w-48">
              <PulsoPulseLine />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
              {t('track.lookup.searching', 'Searching Civic Registry...')}
            </span>
          </div>
        )}

        {/* ── ERROR ALERT ─────────────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {replyMessage && <div role="status" className="p-4 rounded-xl border border-emerald-300 text-emerald-800 dark:text-emerald-300">{replyMessage}</div>}

        {/* ── TRACKING RESULTS ────────────────────────────────────────────────── */}
        {reportData && (
          <div className="space-y-6 animate-fade-in">
            {reportData.status === 'needs_information' && (
              <form onSubmit={handleReplySubmit} className="rounded-xl border border-orange-300 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h2 className="font-bold text-base">{t('track.reply.title', 'Additional information requested')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('track.reply.instructions', 'Read the latest request below. Add the details staff asked for. Sign in as the report owner or use your secret tracking token.')}</p>
                <label htmlFor="track-reply" className="block text-sm font-semibold">{t('track.reply.label', 'Your response')}</label>
                <textarea id="track-reply" value={replyText} onChange={(e) => setReplyText(e.target.value)} minLength={10} maxLength={2000} required rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus-visible:outline-3 focus-visible:outline-orange-500" />
                {replyError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{replyError}</p>}
                <button type="submit" disabled={replyLoading || replyText.trim().length < 10}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-orange-500">
                  {replyLoading ? t('track.reply.sending', 'Sending…') : t('track.reply.send', 'Send information')}
                </button>
              </form>
            )}
            
            {/* Privacy Redaction Banner */}
            <aside className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <ShieldCheck size={16} className="text-slate-400 shrink-0" />
              <span>{t('track.result.privacyNotice', 'Public Privacy Mode Active: Reporter details and private contact info are protected.')}</span>
            </aside>

            {/* Main Ticket Summary */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-lg space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('track.result.ticketHeader', 'Ticket Details')}
                  </span>
                  <div className="font-mono font-black text-2xl text-slate-900 dark:text-white mt-0.5">
                    {reportData.ticket_id || reportData.id || ticketId}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t('track.result.statusLabel', 'Recorded status')}: {t(`track.status.${reportData.status}`, reportData.public_status_label || reportData.status)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase">
                    {reportData.category || 'General Repair'}
                  </span>
                </div>
              </div>

              {/* Location & Reported Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Location:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 select-text">
                      {formatFullAddress(parseAddressString(reportData.location_string)) || reportData.location_string || 'Caloocan City'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 dark:text-slate-500 uppercase">Reported Date:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                      {reportData.created_at ? new Date(reportData.created_at).toLocaleString() : 'Recent'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 6-STAGE PULSELINE STEPPER ──────────────────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t('track.result.pulseLineTitle', 'PulseLine 6-Stage Progress')}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {LIFECYCLE_STAGES.map((stg, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div
                        key={stg.id}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          isCurrent
                            ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 shadow-sm ring-2 ring-orange-500/20'
                            : isCompleted
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 opacity-70'
                        }`}
                      >
                        <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                          isCurrent
                            ? 'bg-orange-600 text-white'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {isCompleted ? <CheckCircle2 size={14} /> : idx + 1}
                        </div>
                        <h3 className={`font-bold text-xs ${isCurrent ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                          {t(`track.stages.${stg.key}.label`, stg.defaultLabel)}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── PUBLIC MILESTONE TIMELINE ───────────────────────────────── */}
              {((reportData.public_timeline && reportData.public_timeline.length > 0) || (reportData.timeline && reportData.timeline.length > 0)) && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('track.result.timelineTitle', 'Public Milestone Timeline')}
                  </h2>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {(reportData.public_timeline || reportData.timeline || []).map((event, i) => (
                      <div key={i} className="relative flex flex-col gap-1 text-xs">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-white dark:ring-slate-900" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {event.label || event.stage || event.status}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        {event.note && (
                          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                            {event.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CONTEXTUAL ACCOUNT CLAIM PROMPT ───────────────────────────── */}
              {trackingToken && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-blue-950 dark:text-blue-200">
                      {t('track.result.claimPrompt', 'Is this your report? Link it to your account for unified management')}
                    </h3>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                      Save this ticket to your resident profile to receive instant push alerts.
                    </p>
                  </div>
                  <Link
                    to={`/login?claim_ticket=${reportData.ticket_id || ticketId}&claim_token=${trackingToken}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <UserPlus size={14} />
                    <span>{t('track.result.claimBtn', 'Claim This Report')}</span>
                  </Link>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
