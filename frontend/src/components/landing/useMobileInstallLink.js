import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../utils/apiBase';
import { publishedAndroidRelease } from '../../utils/appUpdates';

function isPrivateIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

export function useMobileInstallLink(enabled = true) {
  const [wifiIp, setWifiIp] = useState('');
  const [release, setRelease] = useState(null);
  const [downloadState, setDownloadState] = useState('idle');
  const [checkRevision, setCheckRevision] = useState(0);
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  const needsDiscovery = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(hostname);
  const lanHost = needsDiscovery ? wifiIp.trim() : hostname;
  const lanApkUrl = import.meta.env.DEV && isPrivateIpv4(lanHost) ? `http://${lanHost}:4174/` : '';
  const isLanDownload = Boolean(lanApkUrl);
  const apkUrl = lanApkUrl || (release && typeof window !== 'undefined' ? `${window.location.origin}/api/mobile/app-updates/download` : '');
  const activeUrl = apkUrl || (typeof window === 'undefined' ? 'https://pulso.caloocan.gov.ph' : window.location.origin);

  useEffect(() => {
    if (!enabled || !needsDiscovery) return undefined;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/system/network-ip`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network discovery unavailable');
        return res.json();
      })
      .then((data) => {
        if (typeof data?.ip === 'string' && isPrivateIpv4(data.ip)) {
          setWifiIp((existing) => existing || data.ip);
        }
      })
      .catch(() => {
        // The Wi-Fi address can also be entered directly in the dialog.
      });

    return () => controller.abort();
  }, [enabled, needsDiscovery]);

  useEffect(() => {
    if (!enabled || import.meta.env.DEV) return undefined;
    const controller = new AbortController();
    let active = true;
    setDownloadState('checking');
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${API_BASE_URL}/api/mobile/app-updates/latest`, { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('APK unavailable'); return response.json(); })
      .then(data => {
        const candidate = publishedAndroidRelease(data);
        if (!candidate) throw new Error('Invalid package metadata');
        if (active) { setRelease(candidate); setDownloadState('available'); }
      })
      .catch(() => { if (active) { setRelease(null); setDownloadState('unavailable'); } })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [enabled, checkRevision]);

  return { activeUrl, apkUrl, needsDiscovery, wifiIp, setWifiIp, isLanDownload, release, downloadState,
    retryDownloadCheck: () => setCheckRevision(value => value + 1) };
}
