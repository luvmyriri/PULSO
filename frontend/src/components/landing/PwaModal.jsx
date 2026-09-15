import React, { useState, useEffect } from 'react';
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

export default function PwaModal({ isOpen, onClose }) {
  const [activePlatform, setActivePlatform] = useState('android'); // 'ios' | 'android'
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  // Wi-Fi vs Localhost mode
  const [urlMode, setUrlMode] = useState('wifi'); // 'wifi' | 'origin'
  const [wifiIp, setWifiIp] = useState('192.168.0.110');
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [customIp, setCustomIp] = useState('192.168.0.110');
  const [port, setPort] = useState('5173');
  const [originUrl, setOriginUrl] = useState('');

  // Fetch local Wi-Fi IP from backend API
  const fetchNetworkIp = async () => {
    try {
      const res = await fetch('http://localhost:33159/api/system/network-ip');
      if (res.ok) {
        const data = await res.json();
        if (data.ip) {
          setWifiIp(data.ip);
          setCustomIp(data.ip);
        }
      }
    } catch {
      // Keep detected or fallback IP
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
      setPort(currentPort);
      setOriginUrl(window.location.origin);

      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalHost) {
        setUrlMode('wifi');
      } else {
        setUrlMode('origin');
      }
    }

    fetchNetworkIp();

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

  // Compute final URL for QR Code
  const activeUrl = urlMode === 'wifi'
    ? `http://${customIp || wifiIp}${port ? `:${port}` : ''}`
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

  const handleCopyLink = () => {
    if (!activeUrl) return;
    navigator.clipboard?.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Wifi size={13} className="text-emerald-500 animate-pulse" />
                  Same Wi-Fi Ready
                </span>
              </div>
              <h3 id="pwa-modal-title" className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight mt-0.5">
                Install PULSO Mobile App
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
          
          {/* Wi-Fi vs Localhost Network Selector */}
          <div className="p-3 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
              <span className="font-bold">Access from Same Wi-Fi Network:</span>
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-orange-200 dark:border-slate-700 text-xs shadow-2xs w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setUrlMode('wifi')}
                className={`px-3 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  urlMode === 'wifi'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wifi size={13} />
                <span>Wi-Fi IP ({customIp})</span>
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('origin')}
                className={`px-3 py-1 rounded-lg font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  urlMode === 'origin'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe size={13} />
                <span>Localhost / Domain</span>
              </button>
            </div>
          </div>

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
                Scan via Phone
              </span>
            </div>

            {/* Explainer & URL Copy */}
            <div className="flex-1 text-center sm:text-left w-full min-w-0">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h4 className="font-heading font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  Scan to open on your phone
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Connect your phone to the <strong>same Wi-Fi network</strong> and scan the code. No App Store or Play Store download needed!
              </p>

              {/* Direct App URL pill + Copy */}
              <div className="mt-2.5 flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {isEditingIp && urlMode === 'wifi' ? (
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Enter Wi-Fi IPv4 (e.g. 192.168.0.110)"
                    className="font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded outline-none border border-orange-400 flex-1"
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
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isEditingIp ? 'Save IP' : 'Change Wi-Fi IP'}
                  >
                    <Edit3 size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/70 dark:hover:bg-orange-900/80 text-[#ff6b00] dark:text-orange-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Direct Install button if supported by browser */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Install App on this Device</span>
                </button>
              )}
            </div>
          </div>

          {/* Platform Step-by-Step Tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Installation Instructions:
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePlatform === 'android'
                      ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Android (Chrome)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                    <p className="font-bold text-slate-900 dark:text-white">Connect to Same Wi-Fi &amp; Open Site</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Connect your phone to the same Wi-Fi and open <strong className="font-mono text-[#ff6b00]">{activeUrl}</strong> in Google Chrome.</p>
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
                    <p className="font-bold text-slate-900 dark:text-white">Connect to Same Wi-Fi &amp; Scan QR</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">Ensure your iPhone is connected to the same Wi-Fi, open the Camera app, and tap the yellow link to open in Safari.</p>
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 relative z-10">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by Caloocan City Engineering Department
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
