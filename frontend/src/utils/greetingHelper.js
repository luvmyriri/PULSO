/**
 * PULSO Home Greeting Name Formatter
 * ─────────────────────────────────────────────────────────────────────────────
 * Formats a resident's name for the PULSO Home Greeting:
 *   Line 1: "Hello," (with comma)
 *   Line 2: "[First Name] [Last Name]" (no middle names or middle initials)
 *
 * Specifications:
 * 1. Reads from separate saved fields (first_name / firstName and last_name / lastName).
 *    Never splits full_name by spaces when separate fields are present.
 *    Preserves compound given names ("Marc Alexis") and compound surnames ("Dela Cruz").
 * 2. Omits middle names and middle initials in the greeting.
 * 3. Fallback when only full_name is present:
 *    - First word = first name
 *    - Last word (+ suffix like "Jr.", "III" if present) = last name
 *    - Preserves compound surname prefixes (e.g. "Dela Cruz")
 * 4. Single-word names are valid: displayed without extra spacing.
 * 5. Sanitizes against emails, "null", "undefined", "Loading...".
 * 6. Defaults to "Resident" if no valid name exists.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const KNOWN_SUFFIXES = new Set([
    'JR', 'JR.', 'JUNIOR',
    'SR', 'SR.', 'SENIOR',
    'II', '2ND',
    'III', '3RD',
    'IV', '4TH',
    'V', '5TH',
    'VI'
]);

const COMPOUND_LAST_NAME_PREFIXES = new Set([
    'DE LA', 'DELA', 'DE LOS', 'DELOS', 'DE', 'DEL', 'SAN', 'SANTA', 'SANTO'
]);

const KNOWN_SECOND_GIVEN_NAMES = new Set([
    'ALEXIS', 'ANTHONY', 'ANGEL', 'ANGELO', 'ANNE', 'ANN', 'BART', 'CARLOS', 'CRISTINA',
    'DAVID', 'EDWARD', 'ELIZABETH', 'FRANCIS', 'GABRIEL', 'GRACE', 'JAMES', 'JANE',
    'JEAN', 'JOSE', 'JOSEPH', 'JOHN', 'JUDE', 'JUSTINE', 'KATE', 'LOUISE', 'LOUIS',
    'LUIS', 'MAE', 'MARIE', 'MARY', 'MARK', 'MICHAEL', 'NICOLE', 'PAUL', 'PETER',
    'RAYMOND', 'ROSE', 'VINCENT', 'WILMAR'
]);


export function formatGreetingName(user) {
    if (!user) return 'Resident';

    // 1. Check separate fields first (direct fields or user.preferences)
    const separateFirst = (user.first_name || user.firstName || user.preferences?.first_name || user.preferences?.firstName || '').trim();
    const separateLast = (user.last_name || user.lastName || user.preferences?.last_name || user.preferences?.lastName || '').trim();
    const suffix = (user.suffix || user.preferences?.suffix || '').trim();

    const isClean = (str) =>
        Boolean(str && !str.includes('@') && str !== 'null' && str !== 'undefined' && str !== 'Loading...' && str !== 'Resident');

    if (isClean(separateFirst) || isClean(separateLast)) {
        let lastPart = separateLast;
        if (suffix && !lastPart.toUpperCase().includes(suffix.toUpperCase())) {
            lastPart = `${lastPart} ${suffix}`.trim();
        }

        if (separateFirst && lastPart) {
            return `${separateFirst} ${lastPart}`.trim();
        }
        return (separateFirst || lastPart).trim();
    }

    // 2. Fallback to full_name / fullName / name
    const rawFullName = (user.fullName || user.full_name || user.name || '').trim();

    if (
        !rawFullName ||
        rawFullName.includes('@') ||
        rawFullName === 'null' ||
        rawFullName === 'undefined' ||
        rawFullName === 'Loading...' ||
        rawFullName === 'Guest' ||
        rawFullName === 'Resident'
    ) {
        return 'Resident';
    }

    const tokens = rawFullName.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 'Resident';
    if (tokens.length === 1) return tokens[0];

    // Check if the last token is a suffix
    let suffixPart = '';
    let mainTokens = [...tokens];
    const lastTokenUpper = tokens[tokens.length - 1].toUpperCase().replace(/[.,]$/, '');
    if (KNOWN_SUFFIXES.has(lastTokenUpper)) {
        suffixPart = tokens[tokens.length - 1];
        mainTokens = tokens.slice(0, -1);
    }

    if (mainTokens.length === 1) {
        return suffixPart ? `${mainTokens[0]} ${suffixPart}` : mainTokens[0];
    }

    // First name handling: Check if token 0 and token 1 form a common compound given name (e.g. "Marc Alexis")
    let firstPart = mainTokens[0];
    let candidateLastTokens = mainTokens.slice(1);

    if (mainTokens.length >= 3 && KNOWN_SECOND_GIVEN_NAMES.has(mainTokens[1].toUpperCase())) {
        firstPart = `${mainTokens[0]} ${mainTokens[1]}`;
        candidateLastTokens = mainTokens.slice(2);
    }

    // Check for compound last name prefixes in candidateLastTokens
    let lastWord = candidateLastTokens[candidateLastTokens.length - 1];
    if (candidateLastTokens.length >= 2) {
        const oneWordPrefix = candidateLastTokens[candidateLastTokens.length - 2].toUpperCase();
        if (
            candidateLastTokens.length >= 3 &&
            COMPOUND_LAST_NAME_PREFIXES.has(`${candidateLastTokens[candidateLastTokens.length - 3]} ${candidateLastTokens[candidateLastTokens.length - 2]}`.toUpperCase())
        ) {
            lastWord = `${candidateLastTokens[candidateLastTokens.length - 3]} ${candidateLastTokens[candidateLastTokens.length - 2]} ${candidateLastTokens[candidateLastTokens.length - 1]}`;
        } else if (COMPOUND_LAST_NAME_PREFIXES.has(oneWordPrefix)) {
            lastWord = `${candidateLastTokens[candidateLastTokens.length - 2]} ${candidateLastTokens[candidateLastTokens.length - 1]}`;
        }
    }

    const fullLastName = suffixPart ? `${lastWord} ${suffixPart}` : lastWord;
    return `${firstPart} ${fullLastName}`.trim();
}


/**
 * Checks if the user's greeting name is derived from fallback parsing
 * (i.e. only full_name is present without separate first_name / last_name fields).
 * When true, Manage Profile can display: "Check how your name appears."
 */
export function isUsingNameFallback(user) {
    if (!user) return false;
    const separateFirst = (user.first_name || user.firstName || user.preferences?.first_name || user.preferences?.firstName || '').trim();
    const separateLast = (user.last_name || user.lastName || user.preferences?.last_name || user.preferences?.lastName || '').trim();

    const isClean = (str) =>
        Boolean(str && !str.includes('@') && str !== 'null' && str !== 'undefined' && str !== 'Loading...' && str !== 'Resident');

    // If separate fields are present and clean, fallback is not used
    if (isClean(separateFirst) || isClean(separateLast)) {
        return false;
    }

    // Only full_name is present
    const rawFullName = (user.fullName || user.full_name || user.name || '').trim();
    return Boolean(
        rawFullName &&
        !rawFullName.includes('@') &&
        rawFullName !== 'null' &&
        rawFullName !== 'undefined' &&
        rawFullName !== 'Loading...' &&
        rawFullName !== 'Guest' &&
        rawFullName !== 'Resident'
    );
}

