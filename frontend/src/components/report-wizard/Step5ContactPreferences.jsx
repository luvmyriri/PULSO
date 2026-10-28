import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, Mail, Phone, Lock, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { normalizeMobileNumber, validateEmail } from '../../utils/reportWizardValidation';
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
  const phoneInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const consentRef = useRef(null);

  const fullName = contactData?.name || '';
  const phone = contactData?.phone || '';
  const email = contactData?.email || '';
  const consentAccepted = contactData?.consentAccepted || false;
  const receiveUpdates = contactData?.receiveUpdates !== false;

  const nameError = stepErrors.find(e => e.field === 'name');
  const contactError = stepErrors.find(e => e.field === 'contact');
  const phoneError = stepErrors.find(e => e.field === 'phone');
  const emailError = stepErrors.find(e => e.field === 'email');
  const consentError = stepErrors.find(e => e.field === 'consent');

  const emailWarning = stepWarnings.find(w => w.field === 'email');

  useEffect(() => {
    if (nameError && nameInputRef.current) {
      nameInputRef.current.focus();
    } else if ((phoneError || contactError) && phoneInputRef.current) {
      phoneInputRef.current.focus();
    } else if (emailError && emailInputRef.current) {
      emailInputRef.current.focus();
    } else if (consentError && consentRef.current) {
      consentRef.current.focus();
    }
  }, [nameError, contactError, phoneError, emailError, consentError]);

  const handleNameChange = (e) => {
    onContactChange({
      ...contactData,
      name: e.target.value,
    });
  };

  const handlePhoneChange = (e) => {
    onContactChange({
      ...contactData,
      phone: e.target.value,
    });
  };

  const handlePhoneBlur = () => {
    const res = normalizeMobileNumber(phone);
    if (res.valid && res.normalized) {
      onContactChange({
        ...contactData,
        phone: res.normalized,
      });
    }
  };

  const handleEmailChange = (e) => {
    onContactChange({
      ...contactData,
      email: e.target.value,
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
    });
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reportWizard.step5Contact.title', 'How can we reach you?')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t('reportWizard.step5Contact.subtitle', 'Add your name and a mobile number or email to receive updates.')}
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

        {/* Mobile Number & Email with "OR" Divider */}
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label htmlFor="contact-phone" className="block text-sm font-bold text-slate-900 dark:text-white">
              {t('reportWizard.step5Contact.phoneLabel', 'Mobile number')}
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                ref={phoneInputRef}
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder={t('reportWizard.step5Contact.phonePlaceholder', '0917 123 4567')}
                aria-invalid={phoneError ? 'true' : undefined}
                aria-describedby={phoneError ? 'contact-phone-error' : undefined}
                className={`w-full min-h-[48px] pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  phoneError
                    ? 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
            {phoneError ? (
              <p id="contact-phone-error" className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
                <span>{phoneError.message}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Format: 09XX XXX XXXX or +639XX XXX XXXX
              </p>
            )}
          </div>

          {/* "OR" Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 absolute">
              {t('reportWizard.validation.contact.orDivider', 'or')}
            </span>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label htmlFor="contact-email" className="block text-sm font-bold text-slate-900 dark:text-white">
              {t('reportWizard.step5Contact.emailLabel', 'Email address')}
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                ref={emailInputRef}
                id="contact-email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder={t('reportWizard.step5Contact.emailPlaceholder', 'name@example.com')}
                aria-invalid={emailError ? 'true' : undefined}
                aria-describedby={emailError ? 'contact-email-error' : undefined}
                className={`w-full min-h-[48px] pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  emailError
                    ? 'border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
            {emailError && (
              <p id="contact-email-error" className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle size={14} className="shrink-0 text-red-500" aria-hidden="true" />
                <span>{emailError.message}</span>
              </p>
            )}
            {/* Email typo hint */}
            {emailWarning && emailWarning.suggestion && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 animate-fadeIn">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600 shrink-0" />
                  <span>Did you mean <strong>{emailWarning.suggestion}</strong>?</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAcceptTypo(emailWarning.suggestion)}
                  className="px-2 py-0.5 rounded bg-orange-600 text-white font-bold text-[11px] hover:bg-orange-700 transition-colors cursor-pointer"
                >
                  Yes, use this
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              We will send status updates here.
            </p>
          </div>
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
                {t('reportWizard.validation.contact.consentLabel', 'I agree that City Engineering may use these details to follow up on my report')}
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
        onContinue={onContinue}
        isContinueDisabled={false}
      />
    </div>
  );
}
