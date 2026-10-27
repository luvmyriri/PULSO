/**
 * properTextFormatter.js
 * Automatic proper capitalization helper for PULSO.
 *
 * Standardizes names and addresses from all-caps or all-lowercase into Title Case:
 * - Names: "LMA" -> "Lma", "VAL JAVEZ" -> "Val Javez", "marquez" -> "Marquez"
 * - Word breaks: Hyphens ("MARIA-CLARA" -> "Maria-Clara"), Apostrophes ("O'BRIEN" -> "O'Brien"), Spaces ("DE LA CRUZ" -> "De La Cruz")
 * - Special patterns: "MCDONALD" -> "McDonald", Roman numerals ("I", "II", "III"), Suffixes ("Jr.", "Sr.")
 * - Deliberate mixed-case preserved: "McDonald", "dela Cruz", "DeLeon" left exactly as typed
 * - Single letters/initials: "m" -> "M", "M." -> "M."
 * - Addresses: Numbers/mixes ("224", "5A", "B-12"), Roman numerals ("Camarin Residences I"),
 *   lowercase short words when not first word ("Villa de Oro"),
 *   standard abbreviations ("Bldg.", "Blk", "Lot", "Unit", "Rm", "St", "Ave", "Rd", "Brgy", "Subd"),
 *   and known acronyms ("NCR", "PH", "USA").
 */

// Acronyms that must remain fully capitalized
export const KNOWN_ACRONYMS = new Set([
    'NCR', 'PH', 'USA', 'MM', 'QC', 'LGU', 'ID', 'PWD', 'CRN', 'PSN', 'PCN', 'OBO', 'UK', 'PO'
]);

// Roman numerals that must remain fully capitalized
export const ROMAN_NUMERALS = new Set([
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
]);

// Short lowercase particles in addresses (when not the first word)
export const ADDRESS_LOWERCASE_WORDS = new Set([
    'of', 'and', 'the', 'at', 'de', 'la'
]);

// Standard address abbreviations mapped to Title Case forms
export const ADDRESS_ABBREVIATIONS = {
    'blk': 'Blk',
    'lot': 'Lot',
    'bldg': 'Bldg',
    'unit': 'Unit',
    'rm': 'Rm',
    'st': 'St',
    'ave': 'Ave',
    'rd': 'Rd',
    'brgy': 'Brgy',
    'subd': 'Subd',
    'vill': 'Vill',
    'cor': 'Cor',
    'no': 'No',
    'phase': 'Phase'
};

/**
 * Checks if a string contains deliberate mixed case (both uppercase and lowercase letters)
 * while not being an active all-caps run being typed (like 'LmA' or ending with all-caps).
 */
export function isDeliberateMixedCase(str) {
    if (!str || typeof str !== 'string') return false;
    const hasUpper = /[A-Z]/.test(str);
    const hasLower = /[a-z]/.test(str);
    if (!hasUpper || !hasLower) return false;

    // Check if any word is an all-caps continuation (e.g. 'LmA' or ending in 2+ uppercase letters)
    const tokens = str.split(/([ \t\r\n\-/'.,])/);
    for (const t of tokens) {
        if (/^[a-zA-Z]{2,}$/.test(t) && t === t.toUpperCase()) {
            return false; // contains an all-caps word like 'GARCIA'
        }
        if (/^[A-Z][a-z][A-Z]+$/.test(t)) {
            return false; // user typing all-caps after 2-char auto-casing like 'LmA'
        }
    }
    return true;
}

/**
 * Formats a single word token according to name/address rules.
 */
function formatProperToken(token, isAddress = false, wordIndex = 0) {
    if (!token) return '';
    const tokenUpper = token.toUpperCase();
    const tokenLower = token.toLowerCase();

    // 1. Keep numbers and number-letter mixes (e.g. "224", "5A", "B-12")
    if (/\d/.test(token)) {
        return tokenUpper;
    }

    // 2. Known acronyms (e.g. "NCR", "PH", "USA")
    if (KNOWN_ACRONYMS.has(tokenUpper)) {
        return tokenUpper;
    }

    // 3. Roman numerals ("I", "II", "III", "IV", etc.)
    if (ROMAN_NUMERALS.has(tokenUpper)) {
        return tokenUpper;
    }

    // 4. Suffixes: Jr., Sr.
    if (tokenUpper === 'JR' || tokenUpper === 'JR.') return 'Jr.' + (token.endsWith('.') ? '' : '');
    if (tokenUpper === 'SR' || tokenUpper === 'SR.') return 'Sr.' + (token.endsWith('.') ? '' : '');

    // 5. Address-specific rules
    if (isAddress) {
        // Lowercase short words if not the first word ("Villa de Oro")
        if (wordIndex > 0 && ADDRESS_LOWERCASE_WORDS.has(tokenLower)) {
            return tokenLower;
        }

        // Standard abbreviations (e.g. "Bldg.", "Blk", "Lot", "Unit", "Rm", "St", "Ave", "Rd", "Brgy", "Subd")
        const cleanAbbrev = tokenLower.replace(/\.$/, '');
        if (ADDRESS_ABBREVIATIONS[cleanAbbrev]) {
            return ADDRESS_ABBREVIATIONS[cleanAbbrev] + (token.endsWith('.') ? '.' : '');
        }
    }

    // 6. Single letter initials or unit codes: "D" in "BLDG. D", or "m" -> "M"
    if (token.length === 1 && /[a-zA-Z]/.test(token)) {
        return token.toUpperCase();
    }
    if (/^[a-zA-Z]\.$/.test(token)) {
        return token.toUpperCase();
    }

    // 7. Mc pattern: "MCDONALD" -> "McDonald" (apply Mc rule only, leave Mac normal)
    if (tokenUpper.startsWith('MC') && token.length > 2) {
        const rest = token.slice(2);
        return 'Mc' + rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
    }

    // 8. Standard Title Case
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Main shared formatting function.
 * @param {string} value - Text to format
 * @param {boolean} isAddress - True if formatting an address field, false for names
 * @returns {string} - Properly capitalized text
 */
export function formatProperText(value, isAddress = false) {
    if (!value || typeof value !== 'string') return '';
    if (!value.trim()) return value;

    // Single letter or initial
    if (/^[a-z]$/.test(value)) return value.toUpperCase();
    if (/^[a-zA-Z]\.$/.test(value)) return value.toUpperCase();

    // Preserve deliberate mixed-case (e.g. "McDonald", "dela Cruz", "DeLeon")
    if (isDeliberateMixedCase(value)) {
        return value;
    }

    // Tokenize preserving spaces, hyphens, apostrophes, dots, slashes, commas
    const tokens = value.split(/([ \t\r\n\-/'.,])/);
    let wordIndex = 0;

    const formattedTokens = tokens.map(token => {
        // Preserved delimiter
        if (/^[ \t\r\n\-/'.,]$/.test(token)) {
            return token;
        }
        if (!token) return '';

        // If this token individually has deliberate mixed case (e.g. "McDonald" in a phrase), preserve it
        const tHasUpper = /[A-Z]/.test(token);
        const tHasLower = /[a-z]/.test(token);
        if (tHasUpper && tHasLower && !/^[A-Z][a-z][A-Z]+$/.test(token)) {
            wordIndex++;
            return token;
        }

        const currentWordIndex = wordIndex++;
        return formatProperToken(token, isAddress, currentWordIndex);
    });

    return formattedTokens.join('');
}

export const formatProperName = (val) => formatProperText(val, false);
export const formatProperAddress = (val) => formatProperText(val, true);

export default formatProperText;
