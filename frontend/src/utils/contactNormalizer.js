/**
 * contactNormalizer.js
 * Universal contact normalization for PULSO registration and authentication.
 * Mirrors backend/utils/contact_normalizer.py exactly.
 */

export function normalizeEmail(email) {
    if (!email) return '';
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) return clean;

    let [userPart, domainPart] = clean.split('@');
    if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
        domainPart = 'gmail.com';
        userPart = userPart.split('+')[0];
        userPart = userPart.replace(/\./g, '');
    }
    return `${userPart}@${domainPart}`;
}

export function normalizePhoneNumber(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('639') && digits.length === 12) {
        return `+${digits}`;
    }
    if (digits.startsWith('09') && digits.length === 11) {
        return `+63${digits.slice(1)}`;
    }
    if (digits.startsWith('9') && digits.length === 10) {
        return `+63${digits}`;
    }
    if (digits.length >= 10) {
        const suffix10 = digits.slice(-10);
        if (suffix10.startsWith('9')) {
            return `+63${suffix10}`;
        }
    }
    return digits;
}

export function maskEmail(email) {
    if (!email || !email.includes('@')) return email || '';
    const [userPart, domainPart] = email.split('@');
    let maskedUser;
    if (userPart.length <= 2) {
        maskedUser = userPart[0] + '*****';
    } else {
        maskedUser = userPart[0] + '*****' + userPart[userPart.length - 1];
    }
    return `${maskedUser}@${domainPart}`;
}

export function maskPhoneNumber(phone) {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('639') && digits.length === 12) {
        digits = '0' + digits.slice(2);
    } else if (digits.startsWith('9') && digits.length === 10) {
        digits = '0' + digits;
    }

    if (digits.length === 11) {
        return `${digits.slice(0, 4)} *** ${digits.slice(-4)}`;
    }
    if (digits.length >= 7) {
        return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
    }
    return phone;
}
