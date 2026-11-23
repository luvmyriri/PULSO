import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, ShieldCheck, MapPin,
  AlertTriangle, UserPlus, 
  Calendar, Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';
import { getAuthToken } from '../utils/authSession';
import { formatFullAddress, parseAddressString } from '../utils/locationPrivacy';
import WizardHeader from '../components/report-wizard/WizardHeader';

export default function PublicTrackPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0c1421] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <WizardHeader currentStep={1} totalSteps={1} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <TrackReportHeading />
        <TrackReportContent />
      </main>
    </div>
  );
}

export function TrackReportHeading({ as = 'h1', titleId, descriptionId, titleRef }) {
  const { t } = useTranslation();
  const Heading = as;
  return (
    <div className="space-y-2">
      <Heading id={titleId} ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {t('track.header.title', 'Track a report')}
      </Heading>
      <p id={descriptionId} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {t('track.lookup.subtitle', 'Enter the ticket ID and tracking code from your report receipt.')}
      </p>
    </div>
  );
}

export function TrackReportContent({ inSheet = false }) {
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
  const resultRegion = useRef(null);

  useEffect(() => {
    if (inSheet && reportData) resultRegion.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [inSheet, reportData]);

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
          setErrorMsg(t('track.lookup.errorNotFound', 'Check the ticket ID and tracking code and try again.'));
        } else {
          setErrorMsg(t('track.lookup.serviceError', 'Could not load your report. Try again.'));
        }
      }
    } catch (err) {
      console.warn('Track lookup network error:', err);
      setReportData(null);
      setErrorMsg(t('track.lookup.networkError', 'Could not connect. Check your connection and try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const idParam = searchParams.get('id');
    const tokenParam = searchParams.get('token') || searchParams.get('code');
    if (idParam && tokenParam) {
      setTicketId(idParam);
      if (tokenParam) setTrackingToken(tokenParam);
      fetchTrackStatus(idParam, tokenParam || '');
    }
  }, [searchParams, fetchTrackStatus]);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!ticketId.trim() || !trackingToken.trim()) return;
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

  return (
    <div className="space-y-6">
        {/* ── LOOKUP FORM ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleLookupSubmit} className={inSheet ? 'native-track-sheet__form' : 'space-y-5'}>
          <div className={inSheet ? 'native-track-sheet__fields' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
            <div>
              <label htmlFor="track-ticket-id" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {t('track.lookup.ticketLabel', 'Ticket ID')}
              </label>
              <input
                id="track-ticket-id"
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder={inSheet ? t('track.lookup.ticketExample', 'e.g. PUL-2026-0842') : t('track.lookup.ticketPlaceholder', 'Enter ticket ID')}
                required
                autoCapitalize="characters" autoCorrect="off" spellCheck={false} disabled={isLoading}
                className="min-h-12 w-full rounded-md border border-slate-400 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus-visible:outline-blue-300"
              />
            </div>

            <div>
              <label htmlFor="track-token" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                {t('track.lookup.tokenLabel', 'Tracking code')}
              </label>
              <input
                id="track-token"
                type="text"
                required
                value={trackingToken}
                onChange={(e) => setTrackingToken(e.target.value)}
                placeholder={inSheet ? t('track.lookup.tokenReceiptPlaceholder', 'Code from your receipt') : t('track.lookup.tokenPlaceholder', 'Enter tracking code')}
                autoCapitalize="characters" autoCorrect="off" spellCheck={false} disabled={isLoading}
                className="min-h-12 w-full rounded-md border border-slate-400 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus-visible:outline-blue-300"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !ticketId.trim() || !trackingToken.trim()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-base font-bold text-[#0b1630] hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:outline-blue-300"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : !inSheet && <Search size={16} aria-hidden="true" />}
              <span>{isLoading ? t('track.lookup.searching', 'Checking…') : t('track.lookup.submitBtn', 'Track report')}</span>
            </button>
          </div>
        </form>

        {isLoading && <p role="status" className={inSheet ? 'sr-only' : 'text-sm text-slate-600 dark:text-slate-300'}>{t('track.lookup.searching', 'Checking…')}</p>}

        {/* ── ERROR ALERT ─────────────────────────────────────────────────────── */}
        {errorMsg && (
          <div role="alert" className="p-4 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {replyMessage && <div role="status" className="p-4 rounded-xl border border-emerald-300 text-emerald-800 dark:text-emerald-300">{replyMessage}</div>}

        {/* ── TRACKING RESULTS ────────────────────────────────────────────────── */}
        {reportData && (
          <div ref={resultRegion} className="space-y-6 animate-fade-in">
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
              <span>{t('track.result.privacyNotice', 'Your name and contact details are kept private.')}</span>
            </aside>

            {/* Main Ticket Summary */}
            <div className="rounded-lg border border-slate-300 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t('track.result.ticketHeader', 'Ticket Details')}
                  </span>
                  <div className="break-all font-mono font-semibold text-lg text-slate-900 dark:text-white mt-0.5">
                    {reportData.ticket_id || reportData.id || ticketId}
                  </div>
                  <p role="status" className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t('track.result.statusLabel', 'Recorded status')}: {t(`track.status.${reportData.status}`, reportData.public_status_label || reportData.status)}</p>
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
                      {formatFullAddress(parseAddressString(reportData.location_string)) || 'Caloocan City'}
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
                      {t('track.result.claimDescription', 'Sign in to save this report to your account.')}
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

    </div>
  );
}
