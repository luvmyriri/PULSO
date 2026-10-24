/**
 * personTextFormatter.js
 * Formats names and addresses to normal capitalization (Title Case)
 * with Philippine-specific conventions, Roman numerals, abbreviations,
 * and locale-aware accents (e.g. Ñ, ñ).
 */

// Configurable settings list: Acronyms and abbreviations that must remain fully capitalized
export const UPPERCASE_ACRONYMS = new Set([
    'ID', 'PH', 'NCR', 'PWD', 'LGU', 'OBO', 'USA', 'UK', 'PO', 'PSN', 'PCN', 'CRN'
]);

// Roman numerals that must remain fully capitalized
export const ROMAN_NUMERALS = new Set([
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
]);

// Map of common street and building abbreviations to standard title-cased forms
export const STANDARD_ABBREVIATIONS = {
    'BLDG.': 'Bldg.',
    'BLDG': 'Bldg.',
    'BLK.': 'Blk',
    'BLK': 'Blk',
    'BRGY.': 'Brgy.',
    'BRGY': 'Brgy.',
    'ST.': 'St.',
    'ST': 'St.',
    'AVE.': 'Ave.',
    'AVE': 'Ave.',
    'RD.': 'Rd.',
    'RD': 'Rd.',
    'JR.': 'Jr.',
    'JR': 'Jr.',
    'SR.': 'Sr.',
    'SR': 'Sr.',
    'SUBD.': 'Subd.',
    'SUBD': 'Subd.',
    'VILL.': 'Vill.',
    'VILL': 'Vill.',
    'COR.': 'Cor.',
    'COR': 'Cor.',
    'NO.': 'No.',
    'NO': 'No.',
    'UNIT': 'Unit',
    'LOT': 'Lot',
    'PHASE': 'Phase',
};

/**
 * Checks if a string already contains mixed case letters (both uppercase and lowercase).
 * Used so manual capitalization like "McDonald" is not overwritten on blur.
 */
export function isMixedCase(text) {
    if (!text || typeof text !== 'string') return false;
    let hasUpper = false;
    let hasLower = false;
    for (const ch of text) {
        if (ch.toLowerCase() !== ch.toUpperCase()) {
            if (ch === ch.toUpperCase()) hasUpper = true;
            if (ch === ch.toLowerCase()) hasLower = true;
        }
    }
    return hasUpper && hasLower;
}

/**
 * Formats a single word, handling punctuation, hyphens, apostrophes, Roman numerals, and acronyms.
 */
function formatSingleWord(rawWord) {
    if (!rawWord) return '';

    // Separate leading/trailing punctuation from core word
    const match = rawWord.match(/^([^a-zA-Z0-9\u00C0-\u024F]*)([a-zA-Z0-9\u00C0-\u024F\u00D1\u00F1'-]+)([^a-zA-Z0-9\u00C0-\u024F]*)$/);
    if (!match) return rawWord;
    const [, prefix, core, suffix] = match;

    const coreUpper = core.toUpperCase();
    const fullUpper = (core + suffix).toUpperCase();

    // Check abbreviation map first (e.g. "BLDG." -> "Bldg.", "BLK" -> "Blk")
    if (STANDARD_ABBREVIATIONS[fullUpper]) {
        return prefix + STANDARD_ABBREVIATIONS[fullUpper];
    }
    if (STANDARD_ABBREVIATIONS[coreUpper]) {
        return prefix + STANDARD_ABBREVIATIONS[coreUpper] + suffix;
    }

    // Roman Numerals stay capitalized ("I", "II", "III", "IV", "V", etc.)
    if (ROMAN_NUMERALS.has(coreUpper)) {
        return prefix + coreUpper + suffix;
    }

    // Acronyms stay capitalized ("ID", "PH", "NCR", "PWD", etc.)
    if (UPPERCASE_ACRONYMS.has(coreUpper)) {
        return prefix + coreUpper + suffix;
    }

    // Single letter parts stay capitalized ("D", "A", etc.)
    if (core.length === 1 && /[a-zA-Z\u00C0-\u024F]/.test(core)) {
        return prefix + core.toUpperCase() + suffix;
    }

    // Alphanumerics like "2A", "5B", "Phase 2A"
    if (/^\d+[A-Z]$/i.test(core)) {
        return prefix + core.toUpperCase() + suffix;
    }

    // Hyphenated names/words (e.g. "ANNE-MARIE" -> "Anne-Marie")
    if (core.includes('-')) {
        const subParts = core.split('-');
        const formattedSub = subParts.map(sp => formatSingleWord(sp)).join('-');
        return prefix + formattedSub + suffix;
    }

    // Apostrophe handling
    // Starts name part (e.g. "O'BRIEN" -> "O'Brien", "D'ANGELO" -> "D'Angelo")
    // Ends word with possessive (e.g. "MARY'S" -> "Mary's")
    if (core.includes("'")) {
        const parts = core.split("'");
        if (parts.length === 2) {
            const [p1, p2] = parts;
            if (p1.length === 1) {
                const p2Formatted = p2 ? p2.charAt(0).toLocaleUpperCase() + p2.slice(1).toLocaleLowerCase() : '';
                return prefix + p1.toUpperCase() + "'" + p2Formatted + suffix;
            }
            if (p2.toLowerCase() === 's') {
                const p1Formatted = p1.charAt(0).toLocaleUpperCase() + p1.slice(1).toLocaleLowerCase();
                return prefix + p1Formatted + "'s" + suffix;
            }
        }
    }

    // Standard locale-aware title capitalization (preserves "Ñ" -> "ñ", accented characters)
    const lower = core.toLocaleLowerCase();
    const capitalized = lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
    return prefix + capitalized + suffix;
}

/**
 * Main shared formatting function.
 * @param {string} value - The input text
 * @param {string} kind - 'name' | 'address' | 'suffix'
 * @param {object} options - { force: boolean }
 * @returns {string} - Normal-capitalized text
 */
export function formatPersonText(value, kind, options = {}) {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';

    const force = options.force ?? false;
    // If not forced (e.g. on blur), preserve existing mixed-case typing like "McDonald"
    if (!force && isMixedCase(trimmed)) {
        return trimmed;
    }

    const words = trimmed.split(/\s+/);
    const formattedWords = words.map(w => formatSingleWord(w));
    return formattedWords.join(' ');
}

export default formatPersonText;
