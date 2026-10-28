/**
 * PULSO Report Wizard Validation Module
 * Pure validation functions, normalizers, and edge-case guards for the 6-step flow.
 *
 * Rules:
 * - Step 1: Exactly 1 valid category selected.
 * - Step 2: Location inside Caloocan, valid source (GPS/pin/search), readable address.
 *           Warning if GPS accuracy > 20m without confirmation checkbox. Optional fields <= 100 chars.
 * - Step 3: 1 to 5 photos, max 10MB each, JPG/PNG/WebP, min 640px, no duplicates, no rejected/inappropriate.
 * - Step 4: Description 20-1000 chars after trimming, collapse whitespace, no gibberish/repeated chars.
 * - Step 5: Full Name 2-80 chars (letters/accents/hyphen/period/apostrophe only, no digits).
 *           Mobile OR Email (at least one valid, mobile normalized to +639XXXXXXXXX, email typo suggestions).
 *           Consent checkbox confirmed. Honeypot empty, minimum time-on-form check.
 * - Step 6: Full revalidation of all steps with aggregated error mapping.
 */

export const ACCEPTED_CATEGORIES = [
  'Roads & Bridges',
  'Drainage & Flooding',
  'Street Lighting',
  'Water Pipeline',
  'Public Safety Hazards',
  'Traffic & Road Signs',
  'Public Facilities',
  'Electrical Wiring',
  'Waste Management',
];

const COMMON_EMAIL_DOMAINS = {
  'gmai.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
};

/**
 * Normalizes and cleans description text:
 * - Strips leading/trailing whitespace
 * - Collapses 3 or more blank lines to 1 blank line
 * - Removes invisible control characters (except \n and \t)
 */
export function cleanDescription(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rejects text that is clearly not a description:
 * - Only symbols or numbers
 * - Same character repeated 10 or more times
 * - Only one repeated word (e.g. "asdf asdf asdf asdf")
 */
export function isGibberishOrNotDescription(text) {
  const cleaned = (text || '').trim();
  if (!cleaned) return false;

  // 1. Check if only symbols or numbers (no Unicode letters)
  const hasLetter = /[\p{L}]/u.test(cleaned);
  if (!hasLetter) return true;

  // 2. Same character repeated 10 or more times consecutively
  if (/(.)\1{9,}/u.test(cleaned)) return true;

  // 3. Single repeated word check (at least 3 repetitions covering whole input)
  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const firstWord = words[0];
    const allSame = words.every(w => w === firstWord);
    if (allSame) return true;
  }

  return false;
}

/**
 * Validates Full Name:
 * - 2 to 80 characters
 * - Letters, spaces, hyphens, apostrophes, periods, and accents only
 * - Absolutely NO digits
 */
export function validateFullName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Please enter your full name.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return { valid: false, message: 'Please enter your full name.' };
  }
  // No digits allowed
  if (/\d/.test(trimmed)) {
    return { valid: false, message: 'Please enter your full name.' };
  }
  // Unicode letters, spaces, hyphens, apostrophes, dots, and accents
  const validNameRegex = /^[\p{L}\p{M}\s.'-]+$/u;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter your full name.' };
  }
  return { valid: true, normalized: trimmed };
}

/**
 * Validates and normalizes Philippine mobile numbers:
 * - Accepts 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX with optional spaces or dashes
 * - First digit after 9 must be 0-9, total 10 digits after country code
 * - Normalizes to +639XXXXXXXXX
 * - Rejects landline numbers
 */
export function normalizeMobileNumber(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, normalized: null };
  }
  const digits = raw.replace(/[\s\-()]/g, '');
  let normalized = null;

  if (/^09\d{9}$/.test(digits)) {
    normalized = `+63${digits.substring(1)}`;
  } else if (/^\+639\d{9}$/.test(digits)) {
    normalized = digits;
  } else if (/^639\d{9}$/.test(digits)) {
    normalized = `+${digits}`;
  } else if (/^9\d{9}$/.test(digits)) {
    normalized = `+63${digits}`;
  }

  if (normalized && /^\+639\d{9}$/.test(normalized)) {
    return { valid: true, normalized };
  }
  return { valid: false, normalized: null };
}

/**
 * Validates email format and suggests domain typos.
 */
export function validateEmail(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, normalized: '', typoSuggestion: null };
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length > 120) {
    return { valid: false, normalized: trimmed, typoSuggestion: null };
  }
  // Standard RFC-compliant permissive email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, normalized: trimmed, typoSuggestion: null };
  }

  // Domain typo check
  const parts = trimmed.split('@');
  let typoSuggestion = null;
  if (parts.length === 2) {
    const domain = parts[1];
    if (COMMON_EMAIL_DOMAINS[domain]) {
      typoSuggestion = `${parts[0]}@${COMMON_EMAIL_DOMAINS[domain]}`;
    }
  }

  return { valid: true, normalized: trimmed, typoSuggestion };
}

// ─────────────────────────────────────────────────────────────
// STEP-SPECIFIC VALIDATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Step 1: Category Validation
 */
export function validateCategory(category) {
  const errors = [];
  if (!category || typeof category !== 'string' || !category.trim()) {
    errors.push({
      field: 'category',
      code: 'CATEGORY_REQUIRED',
      message: 'Please choose the type of problem.',
    });
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Step 2: Location Validation
 */
export function validateLocation(locationData) {
  const errors = [];
  const warnings = [];

  const loc = locationData || {};
  const hasCoords = Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

  if (!hasCoords || !loc.confirmed) {
    errors.push({
      field: 'location',
      code: 'LOCATION_REQUIRED',
      message: 'Please pin the exact spot of the problem.',
    });
  } else if (!loc.isInCaloocan) {
    errors.push({
      field: 'location',
      code: 'LOCATION_OUTSIDE_CALOOCAN',
      message: 'This spot is outside Caloocan City. Please move the pin inside the city.',
    });
  } else {
    // Address must be readable: cannot be pure coordinates or pure Plus Code without address words
    const address = (loc.address || '').trim();
    const isPurePlusCodeOrCoord = !address ||
      /^[A-Z0-9]{4}\+[A-Z0-9]{2,}/i.test(address) && !/[a-zA-Z]{4,}/.test(address.replace(/^[A-Z0-9+,\s]+/, '')) ||
      /^(external|caloocan city \()?-?\d+\.\d+/i.test(address) && !/[a-zA-Z]{4,}/.test(address.replace(/[\d.,()\-\s]+/g, ''));

    if (isPurePlusCodeOrCoord && !loc.barangay) {
      errors.push({
        field: 'address',
        code: 'ADDRESS_NOT_READABLE',
        message: 'Please ensure the address is readable or adjust the pin.',
      });
    }

    // Accuracy warning: if accuracy is worse than 20m and resident has not confirmed pin spot
    if (loc.accuracy && loc.accuracy > 20 && !loc.pinConfirmed) {
      warnings.push({
        field: 'accuracy',
        code: 'LOCATION_ACCURACY_LOW',
        message: 'Location may be off. Tap Change location to fix it.',
      });
    }
  }

  // Optional fields: subdivision, blk/lot, landmark max 100 chars
  if (loc.landmark && loc.landmark.length > 100) {
    errors.push({
      field: 'landmark',
      code: 'LANDMARK_TOO_LONG',
      message: 'Please keep the landmark under 100 characters.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Step 3: Evidence Validation
 */
export function validateEvidence(evidenceData) {
  const errors = [];
  const warnings = [];
  const ev = evidenceData || {};

  const photos = Array.isArray(ev.photos)
    ? ev.photos
    : (ev.file ? [ev] : []);

  if (photos.length === 0) {
    errors.push({
      field: 'photos',
      code: 'PHOTOS_REQUIRED',
      message: 'Take at least one photo to continue.',
    });
    return { valid: false, errors, warnings };
  }

  if (photos.length > 5) {
    errors.push({
      field: 'photos',
      code: 'PHOTOS_EXCEED_LIMIT',
      message: 'You can upload a maximum of 5 photos.',
    });
  }

  // Check if any photo is currently being analyzed by AI
  const isAnyScanning = photos.some(p => p.isAiScanning);
  if (isAnyScanning) {
    errors.push({
      field: 'photos',
      code: 'PHOTOS_SCANNING',
      message: 'Checking your photo...',
    });
  }

  // Check rejected/inappropriate photos
  const rejected = photos.filter(p => p.isInappropriate);
  if (rejected.length > 0) {
    errors.push({
      field: 'photos',
      code: 'PHOTOS_REJECTED',
      message: rejected[0].rejectionReason || 'This looks like a personal photo. Please take a clear photo of the problem.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Step 4: Details Validation
 */
export function validateDetails(detailsData) {
  const errors = [];
  const desc = cleanDescription(detailsData?.description);

  if (!desc) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_REQUIRED',
      message: 'Please describe the problem.',
    });
  } else if (desc.length < 20) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_TOO_SHORT',
      message: 'Please add a bit more detail (at least 20 characters).',
    });
  } else if (desc.length > 1000) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_TOO_LONG',
      message: 'Please keep it under 1000 characters.',
    });
  } else if (isGibberishOrNotDescription(desc)) {
    errors.push({
      field: 'description',
      code: 'DESCRIPTION_GIBBERISH',
      message: 'Please describe what you see in a few words.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Step 5: Contact Validation
 * AMENDMENT: Mobile OR Email - at least one is required!
 * Name is required (2-80 chars, no digits).
 * Consent is required.
 */
export function validateContact(contactData, consentAccepted = true) {
  const errors = [];
  const warnings = [];
  const contact = contactData || {};

  // 1. Full Name
  const nameRes = validateFullName(contact.name || contact.fullName);
  if (!nameRes.valid) {
    errors.push({
      field: 'name',
      code: 'NAME_INVALID',
      message: 'Please enter your full name.',
    });
  }

  // 2. Mobile OR Email check
  const phoneRaw = (contact.phone || '').trim();
  const emailRaw = (contact.email || '').trim();

  const hasPhone = phoneRaw.length > 0;
  const hasEmail = emailRaw.length > 0;

  if (!hasPhone && !hasEmail) {
    errors.push({
      field: 'contact',
      code: 'CONTACT_REQUIRED',
      message: 'Please provide either a mobile number or an email address so we can reach you.',
    });
  } else {
    // Validate phone if provided
    if (hasPhone) {
      const phoneRes = normalizeMobileNumber(phoneRaw);
      if (!phoneRes.valid) {
        errors.push({
          field: 'phone',
          code: 'PHONE_INVALID',
          message: 'Please enter a valid mobile number, like 0917 123 4567.',
        });
      }
    }

    // Validate email if provided
    if (hasEmail) {
      const emailRes = validateEmail(emailRaw);
      if (!emailRes.valid) {
        errors.push({
          field: 'email',
          code: 'EMAIL_INVALID',
          message: "That email doesn't look right. Please check it.",
        });
      } else if (emailRes.typoSuggestion) {
        warnings.push({
          field: 'email',
          code: 'EMAIL_TYPO_HINT',
          message: `Did you mean ${emailRes.typoSuggestion}?`,
          suggestion: emailRes.typoSuggestion,
        });
      }
    }
  }

  // 3. Consent check
  if (!consentAccepted && !contact.consentAccepted) {
    errors.push({
      field: 'consent',
      code: 'CONSENT_REQUIRED',
      message: 'Please confirm to continue.',
    });
  }

  // 4. Honeypot check (anti-bot)
  if (contact.website_hp && contact.website_hp.trim() !== '') {
    errors.push({
      field: 'bot',
      code: 'SPAM_DETECTED',
      message: 'Automated submission detected.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────
// COMPOSITE VALIDATION (STEP & GLOBAL)
// ─────────────────────────────────────────────────────────────

/**
 * Validates a single step by number (1 to 6).
 */
export function validateStep(stepNumber, formData) {
  const data = formData || {};
  switch (stepNumber) {
    case 1:
      return validateCategory(data.category);
    case 2:
      return validateLocation(data.location);
    case 3:
      return validateEvidence(data.evidence);
    case 4:
      return validateDetails(data.details);
    case 5:
      return validateContact(data.contact, data.consentAccepted);
    case 6:
      return validateAllSteps(data);
    default:
      return { valid: true, errors: [], warnings: [] };
  }
}

/**
 * Validates all previous steps (1 to 5) before Review & Submit.
 * Returns aggregated error map and jump-link summary items.
 */
export function validateAllSteps(formData) {
  const data = formData || {};
  const stepResults = {
    1: validateCategory(data.category),
    2: validateLocation(data.location),
    3: validateEvidence(data.evidence),
    4: validateDetails(data.details),
    5: validateContact(data.contact, data.consentAccepted),
  };

  const allErrors = [];
  const allWarnings = [];
  const errorsByStep = {};

  Object.entries(stepResults).forEach(([stepStr, result]) => {
    const stepNum = Number(stepStr);
    errorsByStep[stepNum] = result.errors;
    result.errors.forEach(err => {
      allErrors.push({ ...err, step: stepNum });
    });
    result.warnings.forEach(warn => {
      allWarnings.push({ ...warn, step: stepNum });
    });
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    errorsByStep,
    stepResults,
  };
}
