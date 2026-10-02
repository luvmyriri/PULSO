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
  const isEmailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // PH phone validation regex (09xxxxxxxxx or +639xxxxxxxxx)
  const isPhoneValid = !phone || /^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ''));

  const hasAtLeastOneContact = Boolean((phone && phone.trim().length > 0) || (email && email.trim().length > 0));

  const canContinue = currentUser 
    ? (isEmailValid && isPhoneValid)
    : (hasAtLeastOneContact && isEmailValid && isPhoneValid);

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {t('reportWizard.step5Contact.title', 'Contact & Notification Preferences')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {currentUser
            ? t('reportWizard.step5Contact.subtitleResident', 'Your report will be automatically attached to your registered resident account.')
            : t('reportWizard.step5Contact.subtitleGuest', 'Provide your contact info so dispatchers can send progress alerts and you can verify your ticket in Track My Report.')}
        </p>
      </div>

      {/* ── AUTHENTICATED RESIDENT STATUS (IF LOGGED IN) ────────────────────── */}
      {currentUser ? (
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
      ) : (
        /* ── GUEST SUBMISSION CONTACT CARD ──────────────────────────────────── */
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <Bell size={18} />
          </div>
          <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Guest Submission · Contact Required for Tracking</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 text-xs leading-relaxed">
              To verify and track this report later without an account, please provide at least a mobile number or email. You will use this contact detail alongside your Ticket ID in <strong>Track My Report</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── CONTACT INPUT FIELDS ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mobile Number */}
          <div>
            <label htmlFor="contact-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              <span>{t('reportWizard.step5Contact.phoneLabel', 'Mobile Number (PH)')}</span>
              {!currentUser && <span className="text-[#ff6b00] ml-1 font-bold">*</span>}
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => onContactChange({ ...contactData, type: 'notify', phone: e.target.value })}
                placeholder={t('reportWizard.step5Contact.phonePlaceholder', '0917 123 4567')}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  !isPhoneValid ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
            {!isPhoneValid && (
              <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">
                {t('reportWizard.step5Contact.validationPhoneError', 'Please enter a valid 11-digit Philippine mobile number (e.g. 09171234567).')}
              </span>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              <span>{t('reportWizard.step5Contact.emailLabel', 'Email Address')}</span>
              {!currentUser && <span className="text-[#ff6b00] ml-1 font-bold">*</span>}
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => onContactChange({ ...contactData, type: 'notify', email: e.target.value })}
                placeholder={t('reportWizard.step5Contact.emailPlaceholder', 'juan@example.com')}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  !isEmailValid ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
            </div>
            {!isEmailValid && (
              <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">
                {t('reportWizard.step5Contact.validationEmailError', 'Please enter a valid email address.')}
              </span>
            )}
          </div>
        </div>

        {!currentUser && !hasAtLeastOneContact && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            * Please enter either a mobile number or email address to enable dispatch notifications and ticket tracking.
          </p>
        )}
      </div>

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
