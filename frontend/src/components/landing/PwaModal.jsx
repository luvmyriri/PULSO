import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Download,
  Copy,
  Check,
  Wifi,
  Globe,
  Edit3
} from 'lucide-react';
import { useMobileInstallLink } from './useMobileInstallLink';

export default function PwaModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isEditingIp, setIsEditingIp] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const { activeUrl, apkUrl, needsDiscovery, wifiIp, setWifiIp, isLanDownload, release, downloadState, retryDownloadCheck } = useMobileInstallLink(isOpen);
  const canCopy = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.writeText);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleCopyLink = async () => {
    if (!activeUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] sm:my-auto animate-in slide-in-from-bottom duration-300 sm:duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header Strip */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff6b00] text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
              <Smartphone size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  {apkUrl ? <Wifi size={13} /> : <Globe size={13} />}
                  {apkUrl ? isLanDownload ? t('mobileInstall.sameWifi') : t('mobileInstall.publicBuild', {version: release?.versionName}) : t('mobileInstall.mobileWebsite')}
                </span>
              </div>
              <h3 id="pwa-modal-title" className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight mt-0.5">
                {apkUrl ? 'PULSO Android APK' : 'Install PULSO Mobile App'}
              </h3>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">

          {/* QR Code & Scan Prompt Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/40 dark:from-slate-800/60 dark:to-orange-950/20 border border-slate-200/80 dark:border-slate-700/80">
            {/* Real Dynamic QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0 flex flex-col items-center">
              <QRCodeSVG
                value={activeUrl}
                size={144}
                level="H"
                marginSize={4}
                title={apkUrl ? t('mobileInstall.qrLabel') : t('mobileInstall.openWebsite')}
              />
              <span className="text-[10px] font-mono font-bold text-slate-500 mt-1.5 uppercase tracking-wider flex items-center gap-1">
                <Wifi size={10} className="text-[#ff6b00]" />
                  Scan via phone
              </span>
            </div>

            {/* Explainer & URL Copy */}
            <div className="flex-1 text-center sm:text-left w-full min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h4 className="font-heading font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  {apkUrl ? 'Scan to download the APK' : 'Scan to open on your phone'}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {apkUrl
                  ? isLanDownload ? t('mobileInstall.sameWifi') : t('mobileInstall.installHelp')
                  : needsDiscovery
                    ? 'Enter your computer’s Wi-Fi address to show the Android APK QR code.'
                    : 'Open PULSO on your phone.'}
              </p>

              {/* Direct App URL pill + Copy */}
              <div className="mt-2.5 flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {isEditingIp && needsDiscovery ? (
                  <input
                    type="text"
                    value={wifiIp}
                    onChange={(e) => setWifiIp(e.target.value)}
                    placeholder="Enter Wi-Fi IPv4 (e.g. 192.168.0.110)"
                    aria-label="Development Wi-Fi address"
                    className="min-h-11 font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-orange-400 flex-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                  />
                ) : (
                  <a href={activeUrl} className="flex min-h-11 flex-1 items-center break-all text-left font-mono text-xs font-bold text-slate-700 underline dark:text-slate-300 focus-visible:outline-3 focus-visible:outline-blue-600">
                    {activeUrl}
                  </a>
                )}

                {needsDiscovery && (
                  <button
                    type="button"
                    onClick={() => setIsEditingIp(!isEditingIp)}
                    aria-label={isEditingIp ? 'Save development address' : 'Change development address'}
                    className="min-h-11 min-w-11 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                    title={isEditingIp ? 'Save IP' : 'Change Wi-Fi IP'}
                  >
                    <Edit3 size={13} />
                  </button>
                )}

                {canCopy && (
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="min-h-11 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/70 dark:hover:bg-orange-900/80 text-[#ff6b00] dark:text-orange-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span aria-live="polite">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {apkUrl && <a href={apkUrl}
                className="mt-3 min-h-11 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-bold text-sm focus-visible:outline-3 focus-visible:outline-blue-600">
                <Download size={16} aria-hidden="true" />{t('mobileInstall.download')}
              </a>}
              {!apkUrl && <p role="status" className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                {t(downloadState === 'checking' ? 'mobileInstall.checking' : 'mobileInstall.unavailable')}
                {downloadState === 'unavailable' && <button type="button" onClick={retryDownloadCheck}
                  className="min-h-11 px-3 underline focus-visible:outline-3 focus-visible:outline-blue-600">{t('mobileInstall.retry')}</button>}
              </p>}

              {/* Direct Install button if supported by browser */}
              {isInstallable && !apkUrl && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="mt-2.5 min-h-11 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                >
                  <Download size={14} />
                  <span>Install App on this Device</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 relative z-10">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by Caloocan City Engineering Department
          </span>
        </div>

      </div>
    </div>
  );
}
