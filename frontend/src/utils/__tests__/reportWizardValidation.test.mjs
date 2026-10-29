import assert from 'node:assert';
import {
  cleanDescription,
  isGibberishOrNotDescription,
  validateFullName,
  normalizeMobileNumber,
  validateEmail,
  validateCategory,
  validateLocation,
  validateEvidence,
  validateDetails,
  validateContact,
  validateStep,
  validateAllSteps,
} from '../reportWizardValidation.js';

console.log('--- RUNNING REPORT WIZARD VALIDATION UNIT TESTS ---');

// 1. Description Cleaning & Boundaries
console.log('1. Testing Description & Length Boundaries (19, 20, 1000, 1001)...');
assert.strictEqual(validateDetails({ description: '' }).valid, false);
assert.strictEqual(validateDetails({ description: '   ' }).valid, false);
assert.strictEqual(validateDetails({ description: 'A'.repeat(19) }).valid, false);
assert.strictEqual(validateDetails({ description: 'A'.repeat(19) }).errors[0].code, 'DESCRIPTION_TOO_SHORT');

const valid20 = 'Pothole near the road';
assert.strictEqual(valid20.length >= 20, true);
assert.strictEqual(validateDetails({ description: valid20 }).valid, true);

const exact1000 = 'A very large pothole on the main street causes traffic issues. '.repeat(16).slice(0, 1000);
assert.strictEqual(exact1000.length, 1000);
assert.strictEqual(validateDetails({ description: exact1000 }).valid, true);

const over1000 = exact1000 + 'X';
assert.strictEqual(over1000.length, 1001);
assert.strictEqual(validateDetails({ description: over1000 }).valid, false);
assert.strictEqual(validateDetails({ description: over1000 }).errors[0].code, 'DESCRIPTION_TOO_LONG');

// 2. Gibberish & Repeated Characters
console.log('2. Testing Gibberish & Repeated Characters Detection...');
assert.strictEqual(isGibberishOrNotDescription('12345678901234567890!@#$%^&*()'), true);
assert.strictEqual(isGibberishOrNotDescription('aaaaaaaaaaaaaaaaaaaaa'), true); // repeated char >= 10
assert.strictEqual(isGibberishOrNotDescription('test test test test test'), true); // repeated single word
assert.strictEqual(isGibberishOrNotDescription('May malaking lubak dito sa tapat ng barangay hall'), false);
assert.strictEqual(isGibberishOrNotDescription('Streetlight is flickering and sparking at night'), false);

// 3. Name Validation (accents, apostrophes, periods, no digits)
console.log('3. Testing Name Validation...');
assert.strictEqual(validateFullName('Ma. Cristina dela Cruz').valid, true);
assert.strictEqual(validateFullName("O'Brien").valid, true);
assert.strictEqual(validateFullName('Juan Muñoz').valid, true);
assert.strictEqual(validateFullName('A').valid, false); // < 2 chars
assert.strictEqual(validateFullName('Juan123').valid, false); // digits rejected
assert.strictEqual(validateFullName('Juan @ Dela Cruz').valid, false); // symbols rejected

// 4. Mobile Number Variants (+639, 09, spaces, dashes, landline rejected)
console.log('4. Testing Mobile Number Variants & Normalization...');
const p1 = normalizeMobileNumber('09171234567');
assert.strictEqual(p1.valid, true);
assert.strictEqual(p1.normalized, '+639171234567');

const p2 = normalizeMobileNumber('0917 123 4567');
assert.strictEqual(p2.valid, true);
assert.strictEqual(p2.normalized, '+639171234567');

const p3 = normalizeMobileNumber('+639171234567');
assert.strictEqual(p3.valid, true);
assert.strictEqual(p3.normalized, '+639171234567');

const p4 = normalizeMobileNumber('63917-123-4567');
assert.strictEqual(p4.valid, true);
assert.strictEqual(p4.normalized, '+639171234567');

// Invalid phones:
assert.strictEqual(normalizeMobileNumber('08171234567').valid, false); // Not 09
assert.strictEqual(normalizeMobileNumber('0281234567').valid, false); // Landline
assert.strictEqual(normalizeMobileNumber('12345').valid, false); // Too short

// 5. Email & Typo Suggestions
console.log('5. Testing Email Validation & Typo Hints...');
const e1 = validateEmail('resident@example.com');
assert.strictEqual(e1.valid, true);
assert.strictEqual(e1.typoSuggestion, null);

const e2 = validateEmail('resident@gmai.com');
assert.strictEqual(e2.valid, true);
assert.strictEqual(e2.typoSuggestion, 'resident@gmail.com');

const e3 = validateEmail('resident@yahooo.com');
assert.strictEqual(e3.valid, true);
assert.strictEqual(e3.typoSuggestion, 'resident@yahoo.com');

const e4 = validateEmail('invalid-email-string');
assert.strictEqual(e4.valid, false);

// 6. Category Step 1
console.log('6. Testing Category Step 1...');
assert.strictEqual(validateCategory('').valid, false);
assert.strictEqual(validateCategory(null).valid, false);
assert.strictEqual(validateCategory('Roads & Bridges').valid, true);

// 7. Location Step 2 (Caloocan boundaries & accuracy warning)
console.log('7. Testing Location Step 2...');
assert.strictEqual(validateLocation(null).valid, false);
assert.strictEqual(validateLocation({ lat: null, lng: null }).valid, false);
assert.strictEqual(validateLocation({ lat: 14.75, lng: 121.05, isInCaloocan: false, confirmed: true }).valid, false);

const validLocHighAccuracy = {
  lat: 14.75,
  lng: 121.05,
  isInCaloocan: true,
  confirmed: true,
  address: '1604 Sampaguita Drive, Barangay 171, Caloocan City',
  accuracy: 10,
};
const locRes1 = validateLocation(validLocHighAccuracy);
assert.strictEqual(locRes1.valid, true);
assert.strictEqual(locRes1.warnings.length, 0);

const locLowAccuracy = {
  ...validLocHighAccuracy,
  accuracy: 35, // > 20m
  pinConfirmed: false,
};
const locRes2 = validateLocation(locLowAccuracy);
assert.strictEqual(locRes2.valid, true);
assert.strictEqual(locRes2.warnings.length, 1);
assert.strictEqual(locRes2.warnings[0].code, 'LOCATION_ACCURACY_LOW');

// 8. Evidence Step 3 (0 photos, 1 photo, rejected photo)
console.log('8. Testing Evidence Step 3...');
assert.strictEqual(validateEvidence({ photos: [] }).valid, false);
assert.strictEqual(validateEvidence({ file: null }).valid, false);

const validPhoto = { file: { name: 'pothole.jpg' }, isInappropriate: false };
assert.strictEqual(validateEvidence({ photos: [validPhoto] }).valid, true);

const rejectedPhoto = { file: { name: 'selfie.jpg' }, isInappropriate: true, rejectionReason: 'This looks like a personal photo.' };
assert.strictEqual(validateEvidence({ photos: [rejectedPhoto] }).valid, false);
assert.strictEqual(validateEvidence({ photos: [rejectedPhoto] }).errors[0].code, 'PHOTOS_REJECTED');

// 9. Updated resident contact contract: email is required; phone is optional.
console.log('9. Testing Contact Step 5...');
// Neither phone nor email
assert.strictEqual(validateContact({ name: 'Juan Cruz', phone: '', email: '' }, true).valid, false);

// A phone alone does not provide the required receipt email.
assert.strictEqual(validateContact({ name: 'Juan Cruz', phone: '09171234567', email: '' }, true).valid, false);

// Only valid email
assert.strictEqual(validateContact({ name: 'Juan Cruz', phone: '', email: 'juan@example.com' }, true).valid, true);

// Both valid phone & email
assert.strictEqual(validateContact({ name: 'Juan Cruz', phone: '09171234567', email: 'juan@example.com' }, true).valid, true);

// Unconfirmed consent
assert.strictEqual(validateContact({ name: 'Juan Cruz', phone: '09171234567', email: '' }, false).valid, false);

// 10. All Steps Aggregated Validation
console.log('10. Testing All Steps Validation...');
const completeValidFormData = {
  category: 'Roads & Bridges',
  location: validLocHighAccuracy,
  evidence: { photos: [validPhoto] },
  details: { description: 'May malaking lubak sa gitna ng daan na nagdudulot ng panganib sa mga motorista.' },
  contact: { name: 'Maria Santos', phone: '09181234567', email: 'maria@example.com' },
  consentAccepted: true,
};

const allValid = validateAllSteps(completeValidFormData);
assert.strictEqual(allValid.valid, true);
assert.strictEqual(allValid.errors.length, 0);

console.log('ALL TESTS PASSED SUCCESSFULLY!');
