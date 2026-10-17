import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Share2,
  PlusSquare,
  Download,
  Copy,
  Check,
  Apple,
  Wifi,
  Globe,
  Edit3,
  RotateCw
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';

const getInitialPort = () => {
  if (typeof window === 'undefined') return '5173';
  return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
};

const getInitialOrigin = () => (
  typeof window === 'undefined' ? '' : window.location.origin
);

const getInitialUrlMode = () => {
  return 'origin';
};

export default function PwaModal({ isOpen, onClose }) {
  const [activePlatform, setActivePlatform] = useState('android'); // 'ios' | 'android'
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('idle');

  // Wi-Fi vs Localhost mode
  const [urlMode, setUrlMode] = useState(getInitialUrlMode); // 'wifi' | 'origin'
  const [wifiIp, setWifiIp] = useState('');
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [customIp, setCustomIp] = useState('');
  const [port] = useState(getInitialPort);
  const [originUrl] = useState(getInitialOrigin);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const isLocalDevelopment = import.meta.env.DEV
    && typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

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
    if (!isOpen || !isLocalDevelopment) return undefined;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/system/network-ip`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network discovery unavailable');
        return res.json();
      })
      .then((data) => {
        if (!data?.ip) throw new Error('Network discovery unavailable');
        setWifiIp(data.ip);
        setCustomIp(data.ip);
        setUrlMode('wifi');
        setNetworkStatus('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setUrlMode('origin');
          setNetworkStatus('unavailable');
        }
      });

    return () => controller.abort();
  }, [isOpen, isLocalDevelopment]);

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

  // Compute final URL for QR Code
  const activeUrl = urlMode === 'wifi'
    ? (customIp || wifiIp ? `http://${customIp || wifiIp}${port ? `:${port}` : ''}` : originUrl)
    : (originUrl || 'https://pulso.caloocan.gov.ph');

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-orange-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff6b00] text-white flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
              <Smartphone size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  {networkStatus === 'ready' ? <Wifi size={13} className="text-emerald-500" /> : <Globe size={13} />}
                  {networkStatus === 'ready' ? 'Same Wi-Fi preview available' : 'Install from a supported browser'}
                </span>
              </div>
              <h3 id="pwa-modal-title" className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight mt-0.5">
                Install PULSO Mobile App
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
                includeMargin={false}
                imageSettings={{
                  src: '/city-engineering-logo.png',
                  x: undefined,
                  y: undefined,
                  height: 34,
                  width: 34,
                  excavate: true,
                }}
              />
              <span className="text-[10px] font-mono font-bold text-slate-500 mt-1.5 uppercase tracking-wider flex items-center gap-1">
                <Wifi size={10} className="text-[#ff6b00]" />
                  {urlMode === 'wifi' ? 'Open mobile preview' : 'Scan via phone'}
              </span>
            </div>

            {/* Explainer & URL Copy */}
            <div className="flex-1 text-center sm:text-left w-full min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h4 className="font-heading font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  {urlMode === 'wifi' ? 'Open the development preview' : 'Scan to open on your phone'}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {urlMode === 'wifi'
                  ? <>This HTTP address opens a same-network preview. Browser installation is unavailable until PULSO is served over HTTPS.</>
                  : <>Open this secure site on your phone, then use your browser&apos;s install or Add to Home Screen action when available.</>}
              </p>

              {/* Direct App URL pill + Copy */}
              <div className="mt-2.5 flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {isEditingIp && urlMode === 'wifi' ? (
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Enter Wi-Fi IPv4 (e.g. 192.168.0.110)"
                    aria-label="Development Wi-Fi address"
                    className="min-h-11 font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-orange-400 flex-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                  />
                ) : (
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate flex-1 text-left font-bold select-all">
                    {activeUrl}
                  </span>
                )}

                {urlMode === 'wifi' && (
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

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="min-h-11 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/70 dark:hover:bg-orange-900/80 text-[#ff6b00] dark:text-orange-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span aria-live="polite">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Direct Install button if supported by browser */}
              {isInstallable && (
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

          {/* Platform Step-by-Step Tabs */}
          <div>
            {urlMode === 'wifi' ? (
              <div className="py-2 text-left">
                <p className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Preview only</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">The same-Wi-Fi HTTP address can preview the mobile layout, but browsers require HTTPS to install PULSO. Use the current secure site for installation.</p>
              </div>
            ) : (
            <>
            <div className="flex flex-col items-start justify-between gap-2 mb-3 sm:flex-row sm:items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Installation Instructions:
              </span>
              <div className="grid w-full grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700 sm:inline-flex sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  aria-pressed={activePlatform === 'android'}
                  className={`min-h-11 min-w-0 justify-center px-2 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 ${
                    activePlatform === 'android'
                      ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  aria-pressed={activePlatform === 'ios'}
                  className={`min-h-11 min-w-0 justify-center px-2 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 ${
                    activePlatform === 'ios'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Apple size={13} />
                  <span>iPhone / iPad</span>
                </button>
              </div>
            </div>

            {/* Android Instructions */}
            {activePlatform === 'android' && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center font-black shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Open the secure PULSO site</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Open <strong className="font-mono text-[#ff6b00]">{activeUrl}</strong> in Google Chrome.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center font-black shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Look for &quot;Install app&quot; in Chrome Menu (⋮)</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Tap the 3 dots in the top-right corner of Chrome and select <strong>&quot;Install app&quot;</strong> (or <strong>&quot;Install PULSO&quot;</strong>). When installed, PULSO launches independently without any Chrome browser URL bar or tabs!</p>
                  </div>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activePlatform === 'ios' && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center font-black shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Scan the secure site QR code</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Open the Camera app and tap the detected link to open PULSO in Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center font-black shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Tap the Share Button</span>
                      <Share2 size={13} className="text-blue-500 inline shrink-0" />
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">At the bottom bar of Safari, tap the Share icon (square box with an arrow pointing up).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/70 text-[#ff6b00] flex items-center justify-center font-black shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Select &quot;Add to Home Screen&quot;</span>
                      <PlusSquare size={13} className="text-[#ff6b00] inline shrink-0" />
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Scroll down in the action sheet, tap <strong>&quot;Add to Home Screen&quot;</strong>, then tap <strong>&quot;Add&quot;</strong>. The official PULSO app icon will appear on your iPhone home screen!</p>
                  </div>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 relative z-10">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by Caloocan City Engineering Department
          </span>
        </div>

      </div>
    </div>
  );
}
