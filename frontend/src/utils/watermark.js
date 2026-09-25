import { formatWatermarkAddress } from './philippineAddress';

/**
 * Formats a Date or date string into a clean, standardized civic timestamp:
 * e.g., "Sep 25, 2026 · 11:05 PM"
 */
export function formatWatermarkTimestamp(dateInput) {
    const d = dateInput instanceof Date ? dateInput : (dateInput ? new Date(dateInput) : new Date());
    if (isNaN(d.getTime())) return '';

    const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `${dateStr} · ${timeStr}`;
}

/**
 * Burns the standardized PULSO Evidence Photo Watermark into an HTML5 Canvas.
 * 
 * SPECIFICATION:
 * - Line 1: App/City identifier ("PULSO · Caloocan City") + Timestamp
 * - Line 2: Full Address (Street/Block-Lot, Subdivision/Village, Barangay) — wraps if needed
 * - Line 3: Latitude, Longitude (monospace)
 * - Maximum vertical footprint: ~15-18% of photo height ceiling
 * - Bulletproof contrast across both pitch dark and bright sunlit photos
 * 
 * @param {HTMLCanvasElement} canvas The canvas containing the rendered photo
 * @param {Object} metadata Metadata containing location, structuredAddress, locationAddress, timestamp
 * @returns {HTMLCanvasElement} The watermarked canvas
 */
export function burnEvidenceWatermark(canvas, metadata = {}) {
    if (!canvas) return canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return canvas;

    // 1. Prepare Content
    const branding = "PULSO · Caloocan City";
    const timestamp = formatWatermarkTimestamp(metadata.timestamp || metadata.capturedAt);

    // Full Address source of truth via shared philippineAddress utility
    const addressSource = metadata.structuredAddress || metadata.locationAddress || metadata.address;
    const addressText = formatWatermarkAddress(addressSource, metadata.location || metadata.coordinates);

    // Coordinates (formatted 4 decimal places as per spec)
    let coordsText = '';
    const loc = metadata.location || metadata.coordinates;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        coordsText = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        if (typeof loc.accuracy === 'number' && loc.accuracy > 0 && loc.accuracy < 100) {
            coordsText += ` (±${Math.round(loc.accuracy)}m)`;
        }
    } else if (metadata.lat && metadata.lng) {
        coordsText = `${Number(metadata.lat).toFixed(4)}, ${Number(metadata.lng).toFixed(4)}`;
    }

    // 2. Geometry & Scale Calculations
    // Max vertical ceiling: 17.5% of height
    const maxBandHeight = height * 0.175;
    const refDim = Math.min(width, height * 1.35);

    // Responsive Base Font Size
    let baseFontSize = Math.max(12, Math.round(refDim * 0.021));

    const padX = Math.max(16, Math.round(width * 0.032));
    let padY = Math.max(10, Math.round(height * 0.016));
    let gap = Math.max(3, Math.round(height * 0.005));

    // Word wrapping for full address line
    const maxAddressWidth = width - (padX * 2);

    function computeLayout(scale) {
        const headerSize = Math.max(11, Math.round(baseFontSize * 1.05 * scale));
        const addressSize = Math.max(10, Math.round(baseFontSize * scale));
        const coordsSize = Math.max(9, Math.round(baseFontSize * 0.92 * scale));

        const headerLineHeight = Math.round(headerSize * 1.32);
        const addressLineHeight = Math.round(addressSize * 1.32);
        const coordsLineHeight = Math.round(coordsSize * 1.32);

        // Word-wrap addressText
        ctx.font = `500 ${addressSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Inter, sans-serif`;
        const words = addressText.split(' ');
        let currentLine = '';
        const addressLines = [];

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxAddressWidth && currentLine) {
                addressLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) addressLines.push(currentLine);

        // Cap address lines at 2 lines maximum so it never pushes the band beyond ceiling
        if (addressLines.length > 2) {
            addressLines[1] = addressLines[1] + '...';
            addressLines.splice(2);
        }

        const linesHeight = headerLineHeight + gap + (addressLines.length * addressLineHeight) + (coordsText ? gap + coordsLineHeight : 0);
        const totalHeight = (padY * 2) + linesHeight;

        return {
            headerSize,
            addressSize,
            coordsSize,
            headerLineHeight,
            addressLineHeight,
            coordsLineHeight,
            addressLines,
            totalHeight
        };
    }

    // Measure and fit within 15-18% vertical ceiling
    let layout = computeLayout(1.0);
    if (layout.totalHeight > maxBandHeight) {
        const scale = Math.max(0.75, maxBandHeight / layout.totalHeight);
        padY = Math.max(6, Math.round(padY * scale));
        gap = Math.max(2, Math.round(gap * scale));
        layout = computeLayout(scale);
    }

    const bandHeight = layout.totalHeight;
    const bandTop = height - bandHeight;

    // 3. Render Dark Semi-Transparent Scrim
    ctx.save();

    // Smooth gradient fade at the top transition into solid protective band
    const gradient = ctx.createLinearGradient(0, bandTop - Math.min(24, bandHeight * 0.15), 0, height);
    gradient.addColorStop(0, 'rgba(6, 10, 18, 0)');
    gradient.addColorStop(0.25, 'rgba(6, 10, 18, 0.72)');
    gradient.addColorStop(0.55, 'rgba(6, 10, 18, 0.86)');
    gradient.addColorStop(1, 'rgba(5, 8, 15, 0.94)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, bandTop - Math.min(24, bandHeight * 0.15), width, bandHeight + Math.min(24, bandHeight * 0.15));

    // Subtle 1.5px top highlight rule (Civic Signal Cut)
    ctx.fillStyle = 'rgba(255, 107, 0, 0.75)';
    ctx.fillRect(padX, bandTop, Math.min(80, width * 0.15), 2); // Orange beacon bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(padX + Math.min(80, width * 0.15), bandTop, width - (padX * 2) - Math.min(80, width * 0.15), 1); // Subtle divider

    // 4. Render Text with High-Contrast Shadow (Guarantees legibility on any photo background)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = Math.max(3, Math.round(refDim * 0.005));
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    let currentY = bandTop + padY + layout.headerLineHeight * 0.82;

    // ── LINE 1: PULSO · Caloocan City   [Timestamp] ──────────────────────────
    ctx.font = `bold ${layout.headerSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Inter, sans-serif`;
    
    // Draw "PULSO" in vibrant orange
    ctx.fillStyle = '#ff7a1a';
    ctx.fillText('PULSO', padX, currentY);
    const pulsoWidth = ctx.measureText('PULSO').width;

    // Draw " · Caloocan City" in crisp white
    ctx.fillStyle = '#ffffff';
    ctx.fillText(' · Caloocan City', padX + pulsoWidth, currentY);

    // Draw Timestamp right-aligned
    if (timestamp) {
        ctx.font = `600 ${Math.round(layout.headerSize * 0.88)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Inter, sans-serif`;
        ctx.fillStyle = '#cbd5e1';
        const timeWidth = ctx.measureText(timestamp).width;
        ctx.fillText(timestamp, width - padX - timeWidth, currentY);
    }

    currentY += gap + layout.headerLineHeight * 0.35;

    // ── LINE 2: [Full Address — wraps if needed] ────────────────────────────
    ctx.font = `500 ${layout.addressSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Inter, sans-serif`;
    ctx.fillStyle = '#f8fafc';

    for (const addrLine of layout.addressLines) {
        currentY += layout.addressLineHeight;
        ctx.fillText(addrLine, padX, currentY);
    }

    // ── LINE 3: [Latitude, Longitude] ───────────────────────────────────────
    if (coordsText) {
        currentY += gap + layout.coordsLineHeight;
        ctx.font = `500 ${layout.coordsSize}px "SF Mono", "Roboto Mono", Menlo, Consolas, Monaco, "Liberation Mono", monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(coordsText, padX, currentY);
    }

    ctx.restore();
    return canvas;
}

/**
 * Watermarks a File or Blob image, burning the standardized PULSO Evidence Watermark
 * onto the image canvas and returning a watermarked JPEG File.
 * 
 * @param {File|Blob} file The image file or blob
 * @param {Object} metadata The evidence metadata (location, structuredAddress, locationAddress, timestamp)
 * @returns {Promise<File>} Resolves with the watermarked File object
 */
export function watermarkEvidenceFile(file, metadata = {}) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided for watermarking."));
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Burn the watermark
                burnEvidenceWatermark(canvas, metadata);

                // Convert canvas back to File
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (blob) {
                        const fileName = file.name ? file.name.replace(/\.[^/.]+$/, "") + "_watermarked.jpg" : "evidence_watermarked.jpg";
                        const watermarkedFile = new File([blob], fileName, { type: 'image/jpeg' });
                        resolve(watermarkedFile);
                    } else {
                        // Fallback to original file if blob conversion fails
                        resolve(file);
                    }
                }, 'image/jpeg', 0.92);
            } catch (err) {
                console.error("Watermark generation error:", err);
                URL.revokeObjectURL(objectUrl);
                // Graceful fallback to original file so submission is never blocked
                resolve(file);
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            console.error("Failed to load image for watermarking:", err);
            resolve(file);
        };

        img.src = objectUrl;
    });
}
