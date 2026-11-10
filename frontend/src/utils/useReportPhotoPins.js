import { useEffect, useRef, useState } from 'react';
import { getReportPhotoUrl, getReportPinPhotoUrl } from './reportMedia';

export const reportPhotoPinKey = (report, color, selected = false) =>
    JSON.stringify([report.id, color, selected, getReportPhotoUrl(report)]);

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });
}

export async function createReportPhotoPin(report, color, selected = false) {
    const photo = getReportPhotoUrl(report);
    if (!photo) return null;
    const thumbnail = getReportPinPhotoUrl(photo);
    let image;
    try { image = await loadImage(thumbnail); }
    catch (error) {
        if (thumbnail === photo) throw error;
        image = await loadImage(photo);
    }
    const size = selected ? 46 : 36;
    const pointerHeight = selected ? 8 : 7;
    const canvas = document.createElement('canvas');
    canvas.width = size + 6;
    canvas.height = size + pointerHeight + 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const cx = canvas.width / 2;
    const cy = size / 2 + 1;
    const radius = (size - 4) / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + radius - 2);
    ctx.lineTo(cx + 5, cy + radius - 2);
    ctx.lineTo(cx, cy + radius + pointerHeight);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - .5, 0, Math.PI * 2);
    ctx.clip();
    const diameter = (radius - .5) * 2;
    const scale = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - .5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    return canvas.toDataURL('image/png');
}

export default function useReportPhotoPins(reports, getCategoryMeta) {
    const cache = useRef(new Map());
    const [icons, setIcons] = useState({});
    useEffect(() => {
        let active = true;
        for (const report of reports || []) {
            if (!getReportPhotoUrl(report)) continue;
            const { color } = getCategoryMeta(report);
            for (const selected of [false, true]) {
                const key = reportPhotoPinKey(report, color, selected);
                if (!cache.current.has(key)) {
                    const job = createReportPhotoPin(report, color, selected).catch(() => {
                        cache.current.delete(key);
                        return null;
                    });
                    cache.current.set(key, job);
                }
                cache.current.get(key).then(icon => {
                    if (active && icon) setIcons(previous => previous[key] === icon ? previous : { ...previous, [key]: icon });
                });
            }
        }
        // Cache promises so a rerender during a slow load cannot drop a photo.
        // Only the current report collection publishes its completed results.
        return () => { active = false; };
    }, [reports, getCategoryMeta]);
    return icons;
}
