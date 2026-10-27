/**
 * addressPartSorter.js
 * Automatically sorts building parts ("Bldg.", "Building", etc.) from
 * House/Unit, Block/Lot, or Street fields into the "Building, Subdivision or Village" field.
 */

import { formatProperText } from './properTextFormatter.js';

// Building keywords
export const BUILDING_KEYWORDS = ['bldg', 'bld', 'blg', 'bldng', 'building'];

// Stop words where a building identifier terminates
export const STOP_WORDS = new Set([
    'unit', 'rm', 'room', 'floor', 'flr', 'fl', 'lot', 'blk', 'block', 'phase', 'ph', '#'
]);

/**
 * Normalizes a string for deduplication comparison (ignoring case, spaces, and dots)
 */
export function normalizeForCompare(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[\s.,\-_/]/g, '');
}

/**
 * Extracts a building part from a text string if present.
 * Returns { buildingPart, remainingText } or null.
 */
export function extractBuildingPart(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Building keywords: Bldg, Bldg., Bld, Bld., Blg, Bldng, Building as whole words
    const bldgRegex = /\b(bldg|bld|blg|bldng|building)(\.|\b)/i;
    const match = trimmed.match(bldgRegex);
    if (!match) return null;

    const keywordStart = match.index;
    if (keywordStart > 0 && /\w/.test(trimmed[keywordStart - 1])) {
        return null; // Part of a word like "Rebuilding"
    }

    const keywordText = match[0];
    const afterKeyword = trimmed.slice(keywordStart + keywordText.length).trim();
    if (!afterKeyword) {
        // "Bldg." alone with no identifier -> NOT moved
        return null;
    }

    // Split after-keyword into tokens
    const tokens = afterKeyword.split(/([ \t,/\-_]+)/).filter(Boolean);
    const identifierWords = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const clean = token.trim();
        if (!clean || /^[ \t,/\-_]+$/.test(token)) {
            if (identifierWords.length > 0 && /[,/]/.test(token)) {
                break;
            }
            continue;
        }

        const lowerClean = clean.toLowerCase().replace(/\.$/, '');
        if (STOP_WORDS.has(lowerClean) || clean.startsWith('#')) {
            break;
        }

        // Rule: If no stop word follows, take only the first word after the keyword
        // (and for a plain number or single letter, nothing more), so "Bldg. D 224" -> "Bldg. D" leaving "224"
        if (identifierWords.length >= 1) {
            const firstIdent = identifierWords[0];
            const isSingleLetterOrNum = /^[A-Za-z0-9]$/.test(firstIdent) || /^\d+[A-Za-z]?$/.test(firstIdent) || /^[A-Za-z]-\d+$/.test(firstIdent);
            if (isSingleLetterOrNum) {
                break;
            }
            // For named buildings like "Building Sunrise Tower": take words until stop word or max 3 words
            if (identifierWords.length >= 2 && !/tower|residences?|plaza|heights|condo|gardens/i.test(clean)) {
                break;
            }
        }

        identifierWords.push(clean);
        if (identifierWords.length >= 3) {
            break;
        }
    }

    if (identifierWords.length === 0) {
        return null;
    }

    // Normalize keyword display:
    // If it was Bldg or Bldg., ensure "Bldg."
    let normKw = keywordText.trim();
    if (/^bldg\.?$/i.test(normKw)) {
        normKw = 'Bldg.';
    } else if (/^building$/i.test(normKw)) {
        normKw = 'Building';
    } else if (/^bld\.?$/i.test(normKw)) {
        normKw = 'Bld.';
    } else if (/^blg\.?$/i.test(normKw)) {
        normKw = 'Blg.';
    }

    // Identifier capitalization: keep single letters / letter-number combos uppercase ("D", "5A", "A-1")
    const formattedIdent = identifierWords.map(w => {
        if (/^[a-zA-Z]$/.test(w) || /^\d+[a-zA-Z]$/.test(w) || /^[a-zA-Z]-\d+$/.test(w)) {
            return w.toUpperCase();
        }
        return formatProperText(w, true);
    }).join(' ');

    const buildingPart = `${normKw} ${formattedIdent}`.trim();

    // Calculate remaining text
    const lastWord = identifierWords[identifierWords.length - 1];
    const afterKwIdx = trimmed.indexOf(afterKeyword, keywordStart);
    const lastWordPos = afterKeyword.indexOf(lastWord);
    const endPos = afterKwIdx + lastWordPos + lastWord.length;

    const beforeText = trimmed.slice(0, keywordStart).trim();
    const afterText = trimmed.slice(endPos).trim();

    const cleanBefore = beforeText.replace(/^[,/\-\s]+|[,/\-\s]+$/g, '').trim();
    const cleanAfter = afterText.replace(/^[,/\-\s]+|[,/\-\s]+$/g, '').trim();

    let remainingText = '';
    if (cleanBefore && cleanAfter) {
        remainingText = `${cleanBefore} ${cleanAfter}`;
    } else {
        remainingText = cleanBefore || cleanAfter || '';
    }

    return {
        buildingPart,
        remainingText
    };
}

/**
 * Main shared sorting helper.
 * Takes the four address fields and moves any building part into "Building, Subdivision or Village".
 *
 * @param {Object} addressParts - { houseNo, blockLot, subdivision, street }
 * @returns {Object} - { houseNo, blockLot, subdivision, street, movedPart, fromField, changed }
 */
export function sortAddressParts(addressParts = {}) {
    let houseNo = (addressParts.houseNo || '').trim();
    let blockLot = (addressParts.blockLot || '').trim();
    let subdivision = (addressParts.subdivision || '').trim();
    let street = (addressParts.street || '').trim();
    const barangay = (addressParts.barangay || '').trim();

    let movedPart = null;
    let fromField = null;
    let changed = false;

    // 1. De-duplication: If Subdivision/Village contains Block and Lot, remove it from Subdivision (never Block/Lot)
    if (blockLot && subdivision) {
        const normBL = normalizeForCompare(blockLot);
        const normSub = normalizeForCompare(subdivision);
        if (normSub.includes(normBL) && normBL.length >= 2) {
            // Escape special regex chars in blockLot and match as whole token
            const escapedBL = blockLot.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s*');
            const blRegex = new RegExp('\\b' + escapedBL + '\\b', 'i');
            if (blRegex.test(subdivision)) {
                subdivision = subdivision.replace(blRegex, ' ').replace(/^[,/\-\s]+|[,/\-\s]+$/g, '').replace(/\s{2,}/g, ' ').trim();
                changed = true;
            } else {
                // Token-based fallback removal
                const subTokens = subdivision.split(/[\s,]+/);
                const blTokens = new Set(blockLot.split(/[\s,-]+/).map(t => t.toUpperCase()));
                const filtered = subTokens.filter(t => !blTokens.has(t.toUpperCase()));
                const newSub = filtered.join(' ').replace(/^[,/\-\s]+|[,/\-\s]+$/g, '').trim();
                if (newSub && newSub !== subdivision) {
                    subdivision = newSub;
                    changed = true;
                }
            }
        }
    }

    // 2. De-duplication: If Street equals Barangay, clear Street (never invent a street from barangay)
    if (street && barangay) {
        const cleanSt = normalizeForCompare(street);
        const cleanBrgy = normalizeForCompare(barangay.replace(/barangay|brgy\.?/gi, ''));
        if (cleanSt === cleanBrgy || (cleanBrgy && cleanSt === cleanBrgy)) {
            street = '';
            changed = true;
        }
    }

    // 3. Move Building part into Subdivision
    // Check fields in strict priority order: houseNo -> blockLot -> street
    const candidates = [
        { key: 'houseNo', label: 'House, Floor or Unit', get: () => houseNo, set: (v) => { houseNo = v; } },
        { key: 'blockLot', label: 'Block and Lot (if any)', get: () => blockLot, set: (v) => { blockLot = v; } },
        { key: 'street', label: 'Street or Road', get: () => street, set: (v) => { street = v; } }
    ];

    for (const item of candidates) {
        const val = item.get();
        const result = extractBuildingPart(val);
        if (result) {
            const { buildingPart, remainingText } = result;

            // Check if subdivision already contains this building part
            const normBuilding = normalizeForCompare(buildingPart);
            const normSubdiv = normalizeForCompare(subdivision);

            if (!normSubdiv.includes(normBuilding)) {
                if (subdivision) {
                    subdivision = `${buildingPart}, ${subdivision}`;
                } else {
                    subdivision = buildingPart;
                }
            }

            item.set(remainingText);
            movedPart = buildingPart;
            fromField = item.label;
            changed = true;
        }
    }

    if (changed) {
        houseNo = formatProperText(houseNo, true);
        blockLot = formatProperText(blockLot, true);
        subdivision = formatProperText(subdivision, true);
        street = formatProperText(street, true);
    }

    return {
        houseNo,
        blockLot,
        subdivision,
        street,
        movedPart,
        fromField,
        changed
    };
}

export default sortAddressParts;
