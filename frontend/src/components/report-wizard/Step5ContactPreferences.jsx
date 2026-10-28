import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, Mail, Lock, Check, AlertCircle, Loader2, LogIn
} from 'lucide-react';
import { validateFullName, validateEmail, validateContact } from '../../utils/reportWizardValidation';
import { API_BASE_URL } from '../../utils/apiBase';
import { getStoredToken } from '../../utils/auth';
import WizardCardFooter from './WizardCardFooter';

export default function Step5ContactPreferences({
  contactData,
  onContactChange,
  onBack,
  onContinue,
  stepErrors = [],
  stepWarnings = [],
}) {
  const { t } = useTranslation();
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const consentRef = useRef(null);

  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'inUse' | 'error'
  const emailCheckSeq = useRef(0);
  const emailAbortController = useRef(null);

  const fullName = contactData?.name || '';
  const email = contactData?.email || '';
  const consentAccepted = contactData?.consentAccepted || false;

  const isGuest = !getStoredToken();

  // Compute live validation when user tries to continue or when fields are touched
  const liveValidation = validateContact(contactData, consentAccepted);
  const activeErrors = localSubmitted ? liveValidation.errors : stepErrors;
  const activeWarnings = liveValidation.warnings.length > 0 ? liveValidation.warnings : stepWarnings;

  const nameError = activeErrors.find(e => e.field === 'name');
  const contactError = activeErrors.find(e => e.field === 'contact');
  const emailError = activeErrors.find(e => e.field === 'email');
  const consentError = activeErrors.find(e => e.field === 'consent');

  const emailWarning = activeWarnings.find(w => w.field === 'email');

  useEffect(() => {
    if (nameError && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if (emailError && emailInputRef.current) {
      emailInputRef.current.focus();
    } else if (consentError && consentRef.current) {
      consentRef.current.focus();
    }
  }, [nameError, emailError, consentError]);

  // Real-time debounced Gmail account availability check for Guests
  useEffect(() => {
    if (!isGuest) {
      setEmailCheckStatus('idle');
      return;
    }

    const cleanVal = (email || '').trim().toLowerCase();
    const emailRes = validateEmail(cleanVal);
    if (!cleanVal || !emailRes.valid || Boolean(emailRes.typoSuggestion)) {
      setEmailCheckStatus('idle');
      if (contactData?.emailInUse) {
        onContactChange({
          ...contactData,
          emailInUse: false,
        });
      }
      return;
    }

    const timer = setTimeout(async () => {
      emailCheckSeq.current += 1;
      const seq = emailCheckSeq.current;

      if (emailAbortController.current) {
        emailAbortController.current.abort();
      }
      const controller = new AbortController();
      emailAbortController.current = controller;

      setEmailCheckStatus('checking');
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanVal }),
          signal: controller.signal,
        });
        if (seq !== emailCheckSeq.current) return;

        if (res.ok) {
          const data = await res.json();
          if (data.email_available) {
            setEmailCheckStatus('available');
            if (contactData?.emailInUse) {
              onContactChange({
                ...contactData,
                emailInUse: false,
              });
            }
          } else {
            setEmailCheckStatus('inUse');
            if (!contactData?.emailInUse) {
              onContactChange({
                ...contactData,
                emailInUse: true,
              });
            }
          }
        } else {
          setEmailCheckStatus('error');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (seq !== emailCheckSeq.current) return;
        setEmailCheckStatus('error');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email, isGuest]);

  const handleNameChange = (e) => {
    onContactChange({
      ...contactData,
      name: e.target.value,
    });
  };

  const handleEmailChange = (e) => {
    onContactChange({
      ...contactData,
      email: e.target.value,
      emailInUse: false,
    });
  };

  const handleEmailBlur = () => {
    if (email) {
      const res = validateEmail(email);
      onContactChange({
        ...contactData,
        email: res.normalized,
      });
    }
  };

  const handleAcceptTypo = (suggested) => {
    onContactChange({
      ...contactData,
      email: suggested,
      emailInUse: false,
    });
  };

  const handleAttemptContinue = () => {
    setLocalSubmitted(true);
    if (emailCheckStatus === 'checking') return;
    const check = validateContact(contactData, consentAccepted);
    if (!check.valid || emailCheckStatus === 'inUse') {
      return;
    }
    onContinue();
  };

  const isAlreadyRegisteredError = emailCheckStatus === 'inUse' || contactData?.emailInUse;
  const nameCheck = validateFullName(fullName);
  const emailCheck = validateEmail(email);
  const hasRequiredFields = Boolean(
    nameCheck.valid &&
    emailCheck.valid &&
    !emailCheck.typoSuggestion &&
    consentAccepted
  );

  return (
    <div className="flex flex-col justify-between flex-1 h-full space-y-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('reportWizard.step5Contact.stepBadge', 'STEP 4 OF 5')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step5Contact.title', 'How can we reach you?')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step5Contact.subtitle', 'Add your full name and Gmail address to receive official report notifications and status updates.')}
          </p>
        </div>

        {/* Global/Contact Missing Error Banner */}
        {contactError && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={18} className="text-red-500 shrink-0" aria-hidden="true" />
            <span>{contactError.message}</span>
          </div>
        )}

        {/* Honeypot field (hidden from screen reader & real users) */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="website_hp">Leave this empty</label>
          <input
            id="website_hp"
            name="website_hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={contactData?.website_hp || ''}
            onChange={(e) => onContactChange({ ...contactData, website_hp: e.target.value })}
          />
        </div>

        {/* Full Name Field (Required) */}
        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="block text-sm font-bold text-slate-900 dark:text-white">
            <span>{t('reportWizard.step5Contact.nameLabel', 'Full name')}</span>
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              ref={nameInputRef}
              id="contact-name"
              type="text"
              value={fullName}
              onChange={handleNameChange}
              placeholder={t('reportWizard.step5Contact.namePlaceholder', 'e.g. Maria Cristina Santos')}
              aria-invalid={nameError ? 'true' : undefined}
              aria-describedby={nameError ? 'contact-name-error' : undefined}
              className={`w-full min-h-[48px] pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                nameError
                  ? 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            />
          </div>
          {nameError && (
            <p id="contact-name-error" className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
              <span>{nameError.message}</span>
            </p>
          )}
        </div>

        {/* Gmail / Email Address (Required) */}
        <div className="space-y-1.5 pt-1">
          <label htmlFor="contact-email" className="block text-sm font-bold text-slate-900 dark:text-white">
            <span>{t('reportWizard.step5Contact.emailLabel', 'Gmail / Email address')}</span>
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              ref={emailInputRef}
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder={t('reportWizard.step5Contact.emailPlaceholder', 'you@gmail.com')}
              aria-invalid={emailError || isAlreadyRegisteredError ? 'true' : undefined}
              aria-describedby={emailError || isAlreadyRegisteredError ? 'contact-email-error' : undefined}
              className={`w-full min-h-[48px] pl-10 pr-10 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                emailError || isAlreadyRegisteredError
                  ? 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500'
                  : emailWarning
                  ? 'border-amber-400 dark:border-amber-600'
                  : emailCheckStatus === 'available'
                  ? 'border-emerald-500/80 dark:border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {emailCheckStatus === 'checking' && (
              <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" aria-hidden="true" />
            )}
            {emailCheckStatus === 'available' && !emailError && !emailWarning && (
              <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
            )}
          </div>

          {/* Guest Existing Account Validation Notice */}
          {isAlreadyRegisteredError ? (
            <div
              id="contact-email-error"
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200 space-y-2 animate-fadeIn"
            >
              <div className="flex items-start gap-2 font-bold text-red-700 dark:text-red-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span>This Gmail address already has an account on PULSO. Please sign in to your account or use a different Gmail address.</span>
              </div>
              <div className="pl-5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6b00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-2xs transition-colors"
                >
                  <LogIn size={13} />
                  <span>Sign In to Your Account</span>
                </Link>
              </div>
            </div>
          ) : emailError ? (
            <p id="contact-email-error" className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
              <span>{emailError.message}</span>
            </p>
          ) : null}

          {/* Email typo hint */}
          {emailWarning && emailWarning.suggestion && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 animate-fadeIn">
              <span>Did you mean <strong>{emailWarning.suggestion}</strong>?</span>
              <button
                type="button"
                onClick={() => handleAcceptTypo(emailWarning.suggestion)}
                className="px-2 py-0.5 rounded bg-orange-600 text-white font-bold text-[11px] hover:bg-orange-700 transition-colors cursor-pointer"
              >
                Yes, use this
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            We will send your official report receipt, tracking code, and status updates to this Gmail address.
          </p>
        </div>

        {/* Consent Checkbox (Required) */}
        <div className="pt-2">
          <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer ${
            consentError
              ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20 dark:bg-red-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              consentAccepted
                ? 'bg-[#ff6b00] text-white'
                : 'border border-slate-300 dark:border-slate-600 bg-transparent'
            }`}>
              {consentAccepted && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            </div>
            <input
              ref={consentRef}
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => onContactChange({ ...contactData, consentAccepted: e.target.checked })}
              className="sr-only"
            />
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed block">
                {t('reportWizard.validation.contact.consentLabel', 'I agree to the use of my contact details for report verification, updates, and follow-ups')}
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your contact details are strictly protected and never published publicly.
              </p>
            </div>
          </label>
          {consentError && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 mt-1.5 pl-1 animate-fadeIn">
              <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
              <span>{consentError.message}</span>
            </p>
          )}
        </div>

        {/* Privacy Note */}
        <aside
          aria-label="Privacy guarantee"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 flex items-start gap-3.5"
        >
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
            <Lock size={18} aria-hidden="true" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {t('reportWizard.step5Contact.privacyCardTitle', 'Your contact details are private')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('reportWizard.step5Contact.privacyCardDesc', 'They will not appear on the public report.')}
            </p>
          </div>
        </aside>
      </div>

      {/* Pinned Footer */}
      <WizardCardFooter
        onBack={onBack}
        canBack={true}
        onContinue={handleAttemptContinue}
        isContinueDisabled={!hasRequiredFields || !liveValidation.valid || Boolean(emailWarning) || emailCheckStatus === 'checking' || isAlreadyRegisteredError}
      />
    </div>
  );
}
