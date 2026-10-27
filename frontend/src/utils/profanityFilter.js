/**
 * profanityFilter.js
 *
 * Client-side validation logic for inappropriate words and profanity
 * in both Tagalog (Filipino) and English for PULSO report notes & civic inputs.
 *
 * Grounded in City Engineering Department standards for public records and civic participation.
 */

const TAGALOG_PATTERNS = [
    // Putangina / Tangina / Puta
    /\b(p[u*o0]tang\s*ina|t[a*@]ng\s*ina|t[a*@]ngina|p[o*0]tangina|p[u*o0]t[a*@]|p[u*o0]tragis)\b/i,
    // Punyeta
    /\b(p[u*]nyeta|p[u*]ny@ta|p[u*]cha|p[u*]changina)\b/i,
    // Gago / Gaga
    /\b(g[a*@]g[o*0]|g[a*@]g[a*@]|k[a*@]g[a*@]g[u*o0]han)\b/i,
    // Tanga / Bobo / Engot
    /\b(t[a*@]ng[a*@]|k[a*@]t[a*@]ng[a*@]h[a*@]n|b[o*0]b[o*0]|k[a*@]b[o*0]b[o*0]h[a*@]n|eng[o*0]t)\b/i,
    // Tarantado
    /\b(t[a*@]r[a*@]nt[a*@]d[o*0]|t[a*@]r[a*@]nt[a*@]d[a*@])\b/i,
    // Hayop ka / Hinayupak
    /\b(h[a*@]y[o*0]p\s*k[a*@]|h[a*@]y[o*0]p\s*k[a*@]y[o*0]|mg[a*@]\s*h[a*@]y[o*0]p|h[i*1!]n[a*@]y[u*o]p[a*@]k)\b/i,
    // Leche
    /\b(l[e*3]ch[e*3]|l[e*3]ts[e*3])\b/i,
    // Bwisit / Buwisit
    /\b(bw[i*1!]s[i*1!]t|b[u*]w[i*1!]s[i*1!]t|bw[i*1!]s[e*3]t)\b/i,
    // Walang hiya
    /\b(w[a*@]l[a*@]ng\s*h[i*1!]y[a*@]|w[a*@]l[a*@]ngh[i*1!]y[a*@])\b/i,
    // Pakshet
    /\b(p[a*@]ksh[e*3]t|p[a*@]ksh[i*1!]t|p[a*@]ky[u*0])\b/i,
    // Additional common Tagalog vulgarities & slurs
    /\b(k[u*]p[a*@]l|h[u*]d[a*@]s|[u*]l[o*0]l|t[i*1!]t[i*1!]|p[u*]k[i*1!]|p[o*0]kp[o*0]k|k[a*@]nt[o*0]t|j[a*@]k[o*0]l|b[a*@]y[a*@]g|t[a*@]m[o*0]d)\b/i,
];

const ENGLISH_PATTERNS = [
    // Fuck / Fucking
    /\b(f[u*]ck|f[u*]ck[i*1!]ng|f[u*]ck[e*3]r|f[u*]ck[e*3]rs|f[u*]ck[e*3]d|f[u*]ck[o*0]ff|m[o*0]th[e*3]rf[u*]ck[e*3]r|m[o*0]th[e*3]rf[u*]ck[i*1!]ng|fck)\b/i,
    // Shit
    /\b(sh[i*1!]t|b[u*]llsh[i*1!]t|sh[i*1!]tty|sh[i*1!]tt[i*1!]ng|sht)\b/i,
    // Bitch
    /\b(b[i*1!]tch|b[i*1!]tch[e*3]s|b[i*1!]tch[i*1!]ng|b[i*1!]tchy)\b/i,
    // Asshole / Jerk
    /\b([a*@]ssh[o*0]l[e*3]|[a*@]ssh[o*0]l[e*3]s|j[e*3]rk|j[e*3]rks)\b/i,
    /\b([a*@]ss|[a*@]ss[e*3]s)\b/i,
    // Bastard / Son of a bitch
    /\b(b[a*@]st[a*@]rd|b[a*@]st[a*@]rds)\b/i,
    /\bs[o*0]n\s+of\s+a\s+b[i*1!]tch\b/i,
    // Idiot / Moron / Stupid
    /\b([i*1!]d[i*1!]ot|[i*1!]d[i*1!]ots|m[o*0]r[o*0]n|m[o*0]r[o*0]ns|st[u*]p[i*1!]d)\b/i,
    // Additional common English vulgarities
    /\b(c[u*]nt|c[u*]nts|d[i*1!]ck|d[i*1!]cks|p[u*]ssy|p[u*]ss[i*1!]es|c[o*0]ck|c[o*0]cks|sl[u*]t|sl[u*]ts|wh[o*0]r[e*3]|wh[o*0]r[e*3]s)\b/i,
];

/**
 * Normalizes input text to catch common leetspeak substitutions
 * and multi-character repeats while preserving base casing for matching.
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/@/g, 'a')
        .replace(/0/g, 'o')
        .replace(/\$/g, 's')
        .replace(/!/g, 'i')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/5/g, 's')
        .replace(/(.)\1{2,}/g, '$1$1');
}

/**
 * Validates text for inappropriate words or profanity (Tagalog & English).
 *
 * @param {string} text - The input notes/description string
 * @returns {{
 *   hasProfanity: boolean,
 *   matches: Array<{ word: string, language: string }>,
 *   message: string | null
 * }}
 */
export function validateProfanity(text, fieldName = 'notes') {
    if (!text || typeof text !== 'string') {
        return { hasProfanity: false, matches: [], message: null };
    }

    const raw = text.toLowerCase();
    const normalized = normalizeText(text);
    const demasked = normalized.replace(/[*_#\-.]/g, '');
    const matches = [];

    for (const pat of TAGALOG_PATTERNS) {
        const m = raw.match(pat) || normalized.match(pat) || demasked.match(pat);
        if (m) {
            matches.push({ word: m[0], language: 'Tagalog' });
        }
    }

    for (const pat of ENGLISH_PATTERNS) {
        const m = raw.match(pat) || normalized.match(pat) || demasked.match(pat);
        if (m) {
            matches.push({ word: m[0], language: 'English' });
        }
    }

    // Deduplicate matches
    const uniqueMatches = [];
    const seen = new Set();
    for (const m of matches) {
        const key = m.word.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            uniqueMatches.push(m);
        }
    }

    if (uniqueMatches.length === 0) {
        return { hasProfanity: false, matches: [], message: null };
    }

    const detectedWords = uniqueMatches.map((m) => `"${m.word}"`).join(', ');
    const message = fieldName === 'notes'
        ? 'Please remove inappropriate or profane words from your notes before submitting.'
        : 'Please remove inappropriate or profane words before submitting.';

    return {
        hasProfanity: true,
        matches: uniqueMatches,
        detectedWords,
        message
    };
}

/**
 * Simple boolean helper to check if text contains profanity.
 */
export function hasProfanity(text) {
    return validateProfanity(text).hasProfanity;
}

export default validateProfanity;
