import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, Phone, Lock, Check
} from 'lucide-react';
import { getStoredUser } from '../../utils/auth';
import WizardCardFooter from './WizardCardFooter';

export default function Step5ContactPreferences({
  contactData,
  onContactChange,
  onBack,
  onContinue,
}) {
  const { t } = useTranslation();
  const [currentUser] = useState(() => getStoredUser());
  const [receiveUpdates, setReceiveUpdates] = useState(true);

  const email = contactData?.email || '';
  const phone = contactData?.phone || '';

  // Validation
  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPhoneValid = !phone || /^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''));
  const hasAtLeastOneContact = Boolean(phone.trim().length > 0 || email.trim().length > 0);

  const canContinue = currentUser 
    ? (isEmailValid && isPhoneValid)
    : (hasAtLeastOneContact && isEmailValid && isPhoneValid);

  const handlePhoneChange = (e) => {
    onContactChange({
      ...contactData,
      type: 'notify',
      phone: e.target.value,
    });
  };

  const handleEmailChange = (e) => {
    onContactChange({
      ...contactData,
      type: 'notify',
      email: e.target.value,
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
            {t('reportWizard.step5Contact.subtitle', 'Add a mobile number or email to receive updates.')}
          </p>
        </div>

        {/* Two Input Fields: Mobile Number & Email Address */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="contact-phone" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t('reportWizard.step5Contact.phoneLabel', 'Mobile number')}
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t('reportWizard.step5Contact.phonePlaceholder', '09XX XXX XXXX')}
                  className={`w-full min-h-[50px] pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    !isPhoneValid ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
              {!isPhoneValid && (
                <span className="text-[11px] text-red-500 font-medium block">
                  Please enter a valid 11-digit Philippine mobile number (e.g. 09171234567).
                </span>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="contact-email" className="block text-sm font-bold text-slate-900 dark:text-white">
                {t('reportWizard.step5Contact.emailLabel', 'Email address')}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t('reportWizard.step5Contact.emailPlaceholder', 'you@example.com')}
                  className={`w-full min-h-[50px] pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    !isEmailValid ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
              {!isEmailValid && (
                <span className="text-[11px] text-red-500 font-medium block">
                  Please enter a valid email address.
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            {t('reportWizard.step5Contact.helperNote', 'Provide either a mobile number or an email address. You can add both.')}
          </p>
        </div>

        {/* Report Updates Section */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('reportWizard.step5Contact.updatesHeading', 'Report updates')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('reportWizard.step5Contact.updatesSubtitle', 'Send me status updates using:')}
            </p>
          </div>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              receiveUpdates
                ? 'bg-[#ff6b00] text-white'
                : 'border border-slate-300 dark:border-slate-600 bg-transparent'
            }`}>
              {receiveUpdates && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            </div>
            <input
              type="checkbox"
              checked={receiveUpdates}
              onChange={(e) => setReceiveUpdates(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('reportWizard.step5Contact.updatesCheckbox', 'My provided contact details')}
            </span>
          </label>
        </div>

        {/* Privacy Card */}
        <aside
          aria-label="Privacy guarantee"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5 flex items-start gap-3.5"
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
        isContinueDisabled={!canContinue}
      />
    </div>
  );
}
