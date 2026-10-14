import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle2, Copy, Check, QrCode, ArrowRight, 
  ExternalLink, UserPlus, RefreshCw, Home, Clock, 
  ShieldCheck 
} from '../icons';
import QRCode from 'qrcode';
import WizardHeader from '../components/report-wizard/WizardHeader';

export default function ReportSuccessPage() {
  const { t } = useTranslation();
  const location = useLocation();

  const receiptState = location.state || {};
  const ticketId = receiptState.ticketId || 'RPT-SAMPLE-RECEIPT';
  const trackingToken = receiptState.trackingToken || 'TRK-XXXX-XXXX-XXXX';
  const trackingUrl = receiptState.trackingUrl || `${window.location.origin}/track?id=${ticketId}&token=${trackingToken}`;
  const category = receiptState.category || 'Infrastructure Repair';
  const locationString = receiptState.locationString || 'Caloocan City';
  const createdAt = receiptState.createdAt ? new Date(receiptState.createdAt).toLocaleString() : new Date().toLocaleString();

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Generate QR Code for fast mobile lookup
  useEffect(() => {
    if (trackingUrl) {
      QRCode.toDataURL(trackingUrl, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR generation error:', err));
    }
  }, [trackingUrl]);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(trackingToken);
    setCopiedToken(true);
    setLiveAnnouncement(t('receipt.trackingTokenSection.tokenCopied', 'Tracking code copied to clipboard!'));
    setTimeout(() => {
      setCopiedToken(false);
      setLiveAnnouncement('');
    }, 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedUrl(true);
    setLiveAnnouncement(t('receipt.trackingTokenSection.urlCopied', 'Tracking link copied to clipboard!'));
    setTimeout(() => {
      setCopiedUrl(false);
      setLiveAnnouncement('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <WizardHeader currentStep={6} totalSteps={6} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        
        {/* ── SUCCESS HERO DOCKET ────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-4xl text-slate-900 dark:text-white">
            {t('receipt.title', 'Report Successfully Logged')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            {t('receipt.subtitle', 'Your report has been received by the Caloocan City Engineering Department and queued for priority triage.')}
          </p>
        </div>

        {/* ── AUTHORITATIVE TICKET RECEIPT CARD ──────────────────────────────── */}
        <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Top Receipt Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('receipt.ticketIdLabel', 'Official Ticket ID')}
              </span>
              <div className="font-mono font-black text-2xl sm:text-3xl text-orange-600 dark:text-orange-400 mt-0.5 tracking-tight">
                {ticketId}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('receipt.statusLabel', 'Current Status')}
              </span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold mt-1">
                <Clock size={13} />
                <span>{t('receipt.statusReceived', 'Received & Queued for Triage')}</span>
              </div>
            </div>
          </div>

          {/* Details Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category:</span>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{category}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Location:</span>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{locationString}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('receipt.timestampLabel', 'Timestamp')}:</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{createdAt}</p>
            </div>
          </div>

          {/* ── PRIVATE TRACKING TOKEN VAULT ─────────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                {t('receipt.trackingTokenSection.title', 'Your Private Tracking Code')}
              </span>
              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-400">
                Keep Secret
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700/60 font-mono font-bold text-sm text-slate-900 dark:text-white tracking-widest text-center sm:text-left select-all">
                {trackingToken}
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
              >
                {copiedToken ? <Check size={16} className="text-white" /> : <Copy size={16} />}
                <span>{copiedToken ? t('receipt.trackingTokenSection.tokenCopied', 'Copied!') : t('receipt.trackingTokenSection.copyToken', 'Copy Code')}</span>
              </button>
            </div>

            <p className="text-[11px] text-amber-900/90 dark:text-amber-300/80 leading-relaxed">
              {t('receipt.trackingTokenSection.subtitle', 'Save this code! You will need it along with your Ticket ID to check updates publicly or link this report to an account later.')}
            </p>
          </div>

          {/* ── QR CODE PASS & QUICK ACTIONS ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center pt-2">
            {/* QR Image */}
            <div className="flex flex-col items-center justify-center text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Report QR Pass" className="w-32 h-32 rounded-xl shadow-sm" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-xl">
                  <QrCode size={36} className="text-slate-400" />
                </div>
              )}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {t('receipt.qrSection.desc', 'Scan with phone camera to open on mobile')}
              </span>
            </div>

            {/* Quick CTAs */}
            <div className="sm:col-span-2 flex flex-col gap-3">
              <Link
                to={`/track?id=${ticketId}&token=${trackingToken}`}
                className="w-full py-3.5 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <span>{t('receipt.actions.trackNow', 'Track This Report Now')}</span>
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
              >
                {copiedUrl ? <Check size={16} /> : <ExternalLink size={16} />}
                <span>{copiedUrl ? t('receipt.trackingTokenSection.urlCopied', 'Link Copied!') : t('receipt.trackingTokenSection.copyUrl', 'Copy Direct Tracking URL')}</span>
              </button>

              <Link
                to={`/login?claim_ticket=${ticketId}&claim_token=${trackingToken}`}
                className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs sm:text-sm border border-blue-200 dark:border-blue-800/60 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <UserPlus size={16} />
                <span>{t('receipt.actions.saveToAccount', 'Save to My Reports (Link Account)')}</span>
              </Link>
            </div>
          </div>

        </div>

        {/* ── GUEST TO RESIDENT CONVERSION PROMPT ───────────────────────────── */}
        {(!receiptState.reporterType || receiptState.reporterType === 'guest') && (
          <div className="rounded-3xl border-2 border-[#ff6b00]/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 sm:p-7 shadow-md flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] text-[11px] font-bold uppercase tracking-wider">
                <UserPlus size={13} />
                <span>Verified Resident Access</span>
              </div>
              <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                Want to track all your reports in one place?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Create a free resident account to unlock your personal citizen dashboard, view live repair updates across Caloocan, and automatically link this report.
              </p>
            </div>
            <Link
              to={`/register?claim_ticket=${ticketId}&claim_token=${trackingToken}`}
              className="shrink-0 w-full sm:w-auto px-6 py-3.5 bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white rounded-xl font-heading font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* ── WHAT HAPPENS NEXT TIMELINE ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-orange-600" />
            <span>{t('receipt.nextSteps.title', 'What Happens Next?')}</span>
          </h2>

          <ol className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">1</span>
              <span>{t('receipt.nextSteps.step1', 'AI and dispatch engineers verify the location and severity within 2 hours.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">2</span>
              <span>{t('receipt.nextSteps.step2', 'An engineering work order is created and assigned to the relevant district field team.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">3</span>
              <span>{t('receipt.nextSteps.step3', 'Field crews inspect and complete repairs, uploading photographic proof of resolution.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">4</span>
              <span>{t('receipt.nextSteps.step4', 'The ticket is marked resolved and closed on the public registry.')}</span>
            </li>
          </ol>
        </div>

        {/* ── BOTTOM RETURN ACTIONS ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-lg"
          >
            <Home size={16} />
            <span>{t('receipt.actions.returnHome', 'Return to Home')}</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 rounded-lg"
          >
            <RefreshCw size={16} />
            <span>{t('receipt.actions.reportAnother', 'Submit Another Report')}</span>
          </Link>
        </div>

      </main>
    </div>
  );
}
