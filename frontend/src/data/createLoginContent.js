/**
 * createLoginContent.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized plain-language copy for the PULSO "Create Login" step
 * (Account Registration, Step 4 of 5).
 * Plain words that a 12-year-old can read, sentences <= 12 words,
 * sentence case, no technical jargon or exclamation marks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CREATE_LOGIN_CONTENT = {
  // Email messages
  'email.checking': 'Checking email...',
  'email.available': 'Email is available.',
  'email.inUse': 'This email is already registered.',
  'email.inUseHelp': 'Use a different one, or sign in.',
  'email.invalid': 'Enter a valid email, like name@gmail.com.',
  'email.required': 'Email is required.',

  // Mobile number messages (Masked to preserve confidentiality)
  'mobile.checking': 'Checking mobile number...',
  'mobile.available': 'Mobile number is available.',
  'mobile.inUse': 'This mobile number is already registered.',
  'mobile.inUseHelp': 'Use a different one, or sign in.',
  'mobile.invalid': 'Enter a valid mobile: 09XX XXX XXXX',
  'mobile.required': 'Mobile number is required.',
  'mobile.placeholder': '09XX XXX XXXX',

  // General check & register messages
  'check.failed': 'We could not check this now. We will check again when you continue.',
  'register.failed': 'We could not create your account. Check your internet and try again.',

  // Buttons & links
  'buttons.signIn': 'Sign in',
  'buttons.createAccount': 'Create Account',
  'buttons.creatingAccount': 'Creating account...',
  'buttons.back': 'Back',

  // Password rules & match
  'password.minLength': 'At least 8 characters',
  'password.match': 'Passwords match',

  // Tagalog (tl) localization dictionary
  tl: {
    'email.checking': 'Sinusuri ang email...',
    'email.available': 'Maaaring gamitin ang email.',
    'email.inUse': 'Narehistro na ang email na ito.',
    'email.inUseHelp': 'Gumamit ng iba, o mag-sign in.',
    'email.invalid': 'Maglagay ng wastong email, tulad ng name@gmail.com.',
    'email.required': 'Kailangan ang email.',

    'mobile.checking': 'Sinusuri ang numero ng telepono...',
    'mobile.available': 'Maaaring gamitin ang numero ng telepono.',
    'mobile.inUse': 'Narehistro na ang numerong ito.',
    'mobile.inUseHelp': 'Gumamit ng iba, o mag-sign in.',
    'mobile.invalid': 'Wastong format: 09XX XXX XXXX',
    'mobile.required': 'Kailangan ang numero ng telepono.',
    'mobile.placeholder': '09XX XXX XXXX',

    'check.failed': 'Hindi ito masuri ngayon. Susuriin muli pagpapatuloy.',
    'register.failed': 'Hindi magawa ang iyong account. Suriin ang internet at subukan muli.',

    'buttons.signIn': 'Mag-sign in',
    'buttons.createAccount': 'Gumawa ng Account',
    'buttons.creatingAccount': 'Ginagawa ang account...',
    'buttons.back': 'Bumalik',

    'password.minLength': 'Hindi bababa sa 8 letra o numero',
    'password.match': 'Tugma ang mga password'
  }
};

/**
 * Returns the localized text for a key, falling back to English.
 */
export function getLoginContent(key, lang = 'en') {
  if (lang === 'tl' && CREATE_LOGIN_CONTENT.tl && CREATE_LOGIN_CONTENT.tl[key]) {
    return CREATE_LOGIN_CONTENT.tl[key];
  }
  return CREATE_LOGIN_CONTENT[key] || '';
}
