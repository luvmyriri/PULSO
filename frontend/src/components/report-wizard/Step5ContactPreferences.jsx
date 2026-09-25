import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserX, Bell, UserCheck, ShieldCheck, 
  ArrowLeft, ArrowRight, Mail, Phone 
} from 'lucide-react';
import { getStoredUser } from '../../utils/auth';

export default function Step5ContactPreferences({
  contactData,
  onContactChange,
  onBack,
  onContinue,
}) {
  const { t } = useTranslation();
  const [currentUser] = useState(() => getStoredUser());

  const contactType = contactData.type || 'anonymous';
  const email = contactData.email || '';
  const phone = contactData.phone || '';

  // Email format validation regex
  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // PH phone validation regex (09xxxxxxxxx or +639xxxxxxxxx)
  const isPhoneValid = !phone || /^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''));

  const canContinue = 
    contactType === 'anonymous' ||
    contactType === 'authenticated' ||
    (contactType === 'notify' && isEmailValid && isPhoneValid && (email.length > 0 || phone.length > 0));

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step5Contact.title', 'Contact & Notification Preferences')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('reportWizard.step5Contact.subtitle', 'Choose how you would like to receive progress updates for this report.')}
        </p>
      </div>

      {/* ── AUTHENTICATED RESIDENT STATUS (IF LOGGED IN) ────────────────────── */}
      {currentUser && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 shadow-sm flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0">
            <UserCheck size={20} strokeWidth={2.2} />
          </div>
          <div className="flex-1 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            <span className="font-bold">
              {t('reportWizard.step5Contact.authenticatedBadge', 'Submitting as Registered Resident: {{name}}', {
                name: currentUser.full_name || currentUser.name || currentUser.username || 'Resident',
              })}
            </span>
            <p className="text-emerald-800/90 dark:text-emerald-300/80 text-xs mt-0.5">
              This report will automatically appear in your resident dashboard with full tracking history.
            </p>
          </div>
        </div>
      )}

      {/* ── CONTACT PREFERENCE PATHWAY OPTIONS ───────────────────────────────── */}
      <fieldset className="space-y-3.5">
        <legend className="sr-only">Choose reporting contact pathway</legend>

        {/* Option 1: Anonymous Guest */}
        <label
          className={`relative block p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            contactType === 'anonymous'
              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <input
              type="radio"
              name="contactType"
              value="anonymous"
              checked={contactType === 'anonymous'}
              onChange={() => onContactChange({ ...contactData, type: 'anonymous' })}
              className="mt-1 text-orange-600 focus:ring-orange-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                <UserX size={18} className="text-slate-500 dark:text-slate-400" />
                <span>{t('reportWizard.step5Contact.guestOption.title', 'Anonymous Guest (No account required)')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('reportWizard.step5Contact.guestOption.desc', 'No email or phone stored. You will receive a private tracking token to check status online.')}
              </p>
            </div>
          </div>
        </label>

        {/* Option 2: Email & SMS Notifications */}
        <label
          className={`relative block p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer ${
            contactType === 'notify'
              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <input
              type="radio"
              name="contactType"
              value="notify"
              checked={contactType === 'notify'}
              onChange={() => onContactChange({ ...contactData, type: 'notify' })}
              className="mt-1 text-orange-600 focus:ring-orange-500"
            />
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  <Bell size={18} className="text-orange-500" />
                  <span>{t('reportWizard.step5Contact.emailOption.title', 'Email & SMS Notifications')}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t('reportWizard.step5Contact.emailOption.desc', 'Receive automated notifications when work crews are assigned and repairs are completed.')}
                </p>
              </div>

              {/* Notification input fields when selected */}
              {contactType === 'notify' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      {t('reportWizard.step5Contact.emailLabel', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => onContactChange({ ...contactData, email: e.target.value })}
                        placeholder={t('reportWizard.step5Contact.emailPlaceholder', 'juan@example.com')}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          !isEmailValid ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {!isEmailValid && (
                      <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">
                        {t('reportWizard.step5Contact.validationEmailError', 'Please enter a valid email address.')}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      {t('reportWizard.step5Contact.phoneLabel', 'Mobile Number (PH)')}
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => onContactChange({ ...contactData, phone: e.target.value })}
                        placeholder={t('reportWizard.step5Contact.phonePlaceholder', '0917 123 4567')}
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          !isPhoneValid ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {!isPhoneValid && (
                      <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">
                        {t('reportWizard.step5Contact.validationPhoneError', 'Please enter a valid 11-digit Philippine mobile number.')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </label>
      </fieldset>

      {/* ── DATA PRIVACY NOTICE (RA 10173) ──────────────────────────────────── */}
      <aside className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs flex items-start gap-2.5">
        <ShieldCheck size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('reportWizard.step5Contact.privacyNotice', 'Your contact information is protected under the Data Privacy Act of 2012 (RA 10173) and will never be shared on public boards.')}
        </p>
      </aside>

      {/* ── ACTION FOOTER ────────────────────────────────────────────────────── */}
      <div className="pt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{t('reportWizard.nav.back', 'Back')}</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            canContinue
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          <span>{t('reportWizard.nav.next', 'Continue')}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
