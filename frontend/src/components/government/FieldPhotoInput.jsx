import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { GovButton } from './GovWorkspace';
import useCaptureLocation from '../../hooks/useCaptureLocation';
import CaptureLocationStatus from '../camera/CaptureLocationStatus';

export default function FieldPhotoInput({ image, metadata, deviceFix, disabled, onChange, onBusyChange }) {
    const [preview, setPreview] = useState('');
    const [camera, setCamera] = useState(false);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);
    const video = useRef(null);
    const stream = useRef(null);
    const mounted = useRef(true);
    const fileInput = useRef(null);
    const cameraTrigger = useRef(null);
    const generation = useRef({ value: 0 });
    const acquiring = useRef(false);
    const location = useCaptureLocation(camera && ready && !disabled, deviceFix);
    function stop(restoreFocus = true) { generation.current.value++; location.stop(); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); setReady(false); if (restoreFocus) requestAnimationFrame(() => cameraTrigger.current?.focus()); }
    useEffect(() => {
        mounted.current = true;
        const counter = generation.current;
        return () => { mounted.current = false; counter.value++; stream.current?.getTracks().forEach(track => track.stop()); };
    }, []);
    useEffect(() => {
        if (!image) { setPreview(''); return; }
        const url = URL.createObjectURL(image); setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [image]);
    useEffect(() => {
        const request = generation.current.value;
        if (camera && video.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => { if (!mounted.current || request !== generation.current.value) return; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); setReady(false); setError('Camera preview could not start. Choose a photo or try again.'); }); }
    }, [camera]);
    useEffect(() => { if (disabled) { generation.current.value++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); } }, [disabled]);

    async function start() {
        if (acquiring.current) return;
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access is unavailable here. Choose a field photo instead.'); return; }
        acquiring.current = true; setWorking(true); onBusyChange(true);
        const request = ++generation.current.value;
        try {
            const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
            if (!mounted.current || request !== generation.current.value) { media.getTracks().forEach(track => track.stop()); return; }
            stream.current = media; setCamera(true);
        } catch { if (mounted.current && request === generation.current.value) setError('Camera permission or device access was unavailable. You can still choose a field photo.'); }
        finally { acquiring.current = false; if (mounted.current) { setWorking(false); onBusyChange(false); } }
    }
    function capture() {
        if (!video.current?.videoWidth || acquiring.current) return;
        acquiring.current = true; setWorking(true); onBusyChange(true);
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas capture unavailable');
            const provenance = location.capture();
            context.drawImage(video.current, 0, 0);
            const request = generation.current.value;
            canvas.toBlob(blob => {
            if (!mounted.current) return;
            if (request !== generation.current.value) { acquiring.current = false; setWorking(false); onBusyChange(false); return; }
            if (blob && blob.size <= 5 * 1024 * 1024) onChange(new File([blob], 'field-camera.jpg', { type: 'image/jpeg' }), provenance);
            else if (blob) setError('The captured frame exceeds 5 MB. Choose a smaller field photo.');
            else setError('The frame could not be captured. Try again or choose a photo.');
            stop(); acquiring.current = false; setWorking(false); onBusyChange(false);
            }, 'image/jpeg', 0.92);
        } catch {
            setError('The camera frame could not be read. Choose a field photo instead.');
            stop(); acquiring.current = false; setWorking(false); onBusyChange(false);
        }
    }
    return <div className="field-photo-input">
        <label className="gov-field">Field photo<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || working} onChange={event => {
            const file = event.target.files?.[0]; if (!file) return;
            if (file.size > 5 * 1024 * 1024) { setError('Choose an image up to 5 MB.'); event.target.value = ''; return; }
            stop(false); setError(''); onChange(file, { source: 'upload', capturedAt: null, deviceFix: null });
        }}/><small>PNG, JPEG or WebP, up to 5 MB. File uploads retain unknown capture time.</small></label>
        <div className="gov-form-actions"><GovButton ref={cameraTrigger} onClick={start} disabled={disabled || camera || working}><Camera size={16} aria-hidden="true"/> Open camera</GovButton>{image && <GovButton disabled={disabled || working} onClick={() => { onChange(null, null); if (fileInput.current) fileInput.current.value = ''; }}>Remove photo</GovButton>}</div>
        {camera && <div><video ref={video} playsInline muted aria-label="Live field camera preview" onLoadedMetadata={() => setReady(true)}/><CaptureLocationStatus status={location.status} className="gov-note"/><div className="gov-form-actions"><GovButton primary disabled={!ready || disabled || working} onClick={capture}>Capture frame</GovButton><GovButton onClick={stop} disabled={working}><X size={16} aria-hidden="true"/> Close camera</GovButton></div></div>}
        {preview && <figure className="field-evidence"><img src={preview} alt="Selected field evidence for this observation"/><figcaption>{image.name || 'Stored field photo'} · {metadata?.source === 'camera' ? `Camera frame captured ${new Date(metadata.capturedAt).toLocaleString('en-PH')}` : 'Uploaded photo · capture time unknown'}</figcaption></figure>}
        {error && <p role="alert" className="gov-error">{error}</p>}
    </div>;
}
