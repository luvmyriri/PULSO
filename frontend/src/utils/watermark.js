import { formatWatermarkAddress } from './locationPrivacy';

/**
 * Formats a Date or date string into a clean, standardized civic timestamp:
 * e.g., "Oct 16, 2026 · 3:02 PM"
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

/** Only measured/selected coordinates are included; never use a default point. */
export function formatWatermarkCoordinates(metadata = {}) {
    const location = metadata.location || metadata.coordinates || { lat: metadata.lat, lng: metadata.lng };
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)
        || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) return '';
    return `Lat ${location.lat.toFixed(6)} · Lng ${location.lng.toFixed(6)}`;
}

/**
 * drawEvidenceWatermark / burnEvidenceWatermark
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Watermark Drawing Function for PULSO Evidence (Live Preview & Saved Photos).
 * 
 * SPECIFICATION (SENIOR UX & ACCESSIBILITY CONTRACT):
 * 1. Base unit "u" = Math.min(width, height) (the photo's SHORTER side).
 * 2. Main text size: 3.4% of u. Small text (coordinates): 2.6% of u.
 *    Padding: 3% of u on all sides. Line spacing: 1.35.
 *    Never smaller than 14px on a 1280px photo; scales up proportionally for bigger photos.
 * 3. Dynamic Height & Wrap Guard:
 *    - If the panel would take > 30% of photo height, step down main text size in steps
 *      down to a minimum of 2.8% of u.
 *    - If it still does not fit within 30%, widen side padding to 2% of u.
 *    - Panel is allowed to grow instead of hiding words. NEVER cut text off. NO "..." anywhere.
 * 4. Content:
 *    - Line 1: Left "PULSO · Caloocan City" (PULSO in #ff6b00, rest in white bold)
 *              Right timestamp ("Oct 16, 2026 · 3:02 PM")
 *    - Next lines: Privacy-safe address with a coarse area Plus Code, in white bold
 *    - Last line: Selected latitude/longitude and actual GPS accuracy, when available.
 * 5. Contrast & Scrim:
 *    - Dark vertical gradient panel anchored to bottom (fade to clear at top, 78% opacity at bottom).
 *    - Thin dark outline on text for 100% legibility on any bright or noisy background.
 *    - Font: Inter bold embedded/specified with system fallbacks.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function drawEvidenceWatermark(canvas, metadata = {}) {
    if (!canvas) return canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return canvas;

    // 1. Prepare Content
    const brandingPulso = "PULSO";
    const brandingCity = " · Caloocan City";
    const timestamp = formatWatermarkTimestamp(metadata.timestamp || metadata.capturedAt);

    // Full address uses the same Plus Code shown in the location card.
    const addressSource = metadata.structuredAddress || metadata.locationAddress || metadata.address;
    const addressText = formatWatermarkAddress(addressSource, metadata.location || metadata.coordinates);

    // The resident requested coordinates on both the live and saved watermark.
    const coordsText = formatWatermarkCoordinates(metadata);
    const loc = metadata.location || metadata.coordinates;

    // Accuracy indicator pill (e.g. "(±12m)")
    const rawAccuracy = loc?.accuracy ?? metadata.accuracy ?? metadata.location?.accuracy ?? metadata.coordinates?.accuracy ?? metadata.reportLocation?.accuracy;
    const accuracyNum = (typeof rawAccuracy === 'number' && !isNaN(rawAccuracy) && rawAccuracy > 0)
        ? Math.round(rawAccuracy)
        : null;
    const accuracyText = accuracyNum ? `(±${accuracyNum}m)` : '';

    // 2. Base Unit "u" = shorter side
    const u = Math.min(width, height);
    const lineSpacing = 1.35;

    // Minimum absolute font size: 14px on a 1280px long side photo
    const longSide = Math.max(width, height);
    const minAbsoluteFont = Math.max(12, Math.round(14 * (longSide / 1280)));

    // Helper to wrap text into lines without ever truncating
    function getWrappedLines(text, maxW, font) {
        if (!text) return [];
        ctx.font = font;
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxW && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // 3. Layout Optimizer (stepped down to 2.8% of u, then 2% side padding if needed)
    let selectedLayout = null;
    let mainRatio = 0.034; // 3.4% of u
    const minRatio = 0.028; // 2.8% of u minimum step
    let sidePadRatio = 0.03; // 3% of u default
    const maxAllowedHeight = height * 0.30; // 30% of photo height ceiling

    while (mainRatio >= minRatio - 0.0001) {
        const mainFontSize = Math.max(minAbsoluteFont, Math.round(u * mainRatio));
        const smallFontSize = Math.max(Math.round(minAbsoluteFont * 0.82), Math.round(u * mainRatio * (0.026 / 0.034)));
        const padX = Math.max(12, Math.round(u * sidePadRatio));
        const padY = Math.max(10, Math.round(u * 0.03));
        const gap = Math.max(4, Math.round(u * 0.008));

        const mainLineHeight = Math.round(mainFontSize * lineSpacing);
        const smallLineHeight = Math.round(smallFontSize * lineSpacing);

        const availableAddressWidth = width - (padX * 2);
        const addressFont = `bold ${mainFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const addressLines = getWrappedLines(addressText, availableAddressWidth, addressFont);

        const linesHeight = mainLineHeight + gap + (addressLines.length * mainLineHeight) + ((coordsText || accuracyText) ? gap + smallLineHeight : 0);
        const totalHeight = (padY * 2) + linesHeight;

        selectedLayout = {
            mainFontSize,
            smallFontSize,
            padX,
            padY,
            gap,
            mainLineHeight,
            smallLineHeight,
            addressLines,
            totalHeight,
            mainRatio,
            sidePadRatio
        };

        if (totalHeight <= maxAllowedHeight) {
            break; // Fits within 30%!
        }

        // Step down mainRatio
        mainRatio -= 0.002;
    }

    // If still exceeds 30% at minimum text ratio, widen side padding to 2% and re-wrap
    if (selectedLayout && selectedLayout.totalHeight > maxAllowedHeight && sidePadRatio > 0.02) {
        sidePadRatio = 0.02;
        const mainFontSize = selectedLayout.mainFontSize;
        const padX = Math.max(10, Math.round(u * sidePadRatio));
        const availableAddressWidth = width - (padX * 2);
        const addressFont = `bold ${mainFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const addressLines = getWrappedLines(addressText, availableAddressWidth, addressFont);

        const linesHeight = selectedLayout.mainLineHeight + selectedLayout.gap + (addressLines.length * selectedLayout.mainLineHeight) + ((coordsText || accuracyText) ? selectedLayout.gap + selectedLayout.smallLineHeight : 0);
        const totalHeight = (selectedLayout.padY * 2) + linesHeight;

        selectedLayout = {
            ...selectedLayout,
            padX,
            sidePadRatio,
            addressLines,
            totalHeight
        };
        // Panel is allowed to grow rather than hiding words
    }

    const {
        mainFontSize,
        smallFontSize,
        padX,
        padY,
        gap,
        mainLineHeight,
        smallLineHeight,
        addressLines,
        totalHeight
    } = selectedLayout;

    const panelTop = height - totalHeight;

    // 4. Render Text with Crisp Dark Shadow/Outline (No background scrim)
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    const fontMain = `bold ${mainFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const fontSmall = `bold ${smallFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const outlineColor = 'rgba(0, 0, 0, 0.65)';
    const outlineWidth = Math.max(2, Math.round(mainFontSize * 0.14));

    let currentY = panelTop + padY + (mainLineHeight * 0.78);

    // ── LINE 1: PULSO · Caloocan City   [Timestamp] ──────────────────────────
    ctx.font = fontMain;

    // Draw PULSO in vibrant orange
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(brandingPulso, padX, currentY);
    ctx.fillStyle = '#ff6b00';
    ctx.fillText(brandingPulso, padX, currentY);

    const pulsoWidth = ctx.measureText(brandingPulso).width;

    // Draw " · Caloocan City" in pure white
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(brandingCity, padX + pulsoWidth, currentY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(brandingCity, padX + pulsoWidth, currentY);

    // Draw Timestamp right-aligned
    if (timestamp) {
        ctx.font = `600 ${Math.round(mainFontSize * 0.92)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const timeWidth = ctx.measureText(timestamp).width;
        const timeX = width - padX - timeWidth;

        ctx.strokeStyle = outlineColor;
        ctx.strokeText(timestamp, timeX, currentY);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(timestamp, timeX, currentY);
    }

    currentY += gap + (mainLineHeight * 0.35);

    // ── NEXT LINES: Full readable address in white bold (NO "..." anywhere) ───
    ctx.font = fontMain;
    for (const addrLine of addressLines) {
        currentY += mainLineHeight;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.strokeText(addrLine, padX, currentY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(addrLine, padX, currentY);
    }

    // ── LAST LINE: Coordinates & Accuracy (Bold White, No Oval/Pill Shape) ───
    const fullCoordsLine = coordsText && accuracyText ? `${coordsText} ${accuracyText}` : (coordsText || accuracyText);
    if (fullCoordsLine) {
        currentY += gap + smallLineHeight;
        ctx.font = fontSmall;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = Math.max(1.8, Math.round(smallFontSize * 0.14));
        ctx.strokeText(fullCoordsLine, padX, currentY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(fullCoordsLine, padX, currentY);
    }

    ctx.restore();
    return canvas;
}

/**
 * Standard alias for backward compatibility.
 */
export const burnEvidenceWatermark = drawEvidenceWatermark;

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

                // Burn the watermark using shared logic
                drawEvidenceWatermark(canvas, metadata);

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
