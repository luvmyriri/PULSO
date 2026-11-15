import { UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import NativeBottomSheet from './NativeBottomSheet';
import './native-guest-report-sheet.css';

export default function NativeGuestReportSheet({ onDismiss }) {
  const { t } = useTranslation();
  return (
    <NativeBottomSheet
      title={<span className="native-guest-report__title"><UserRound size={22} aria-hidden="true" />{t('nativeAndroid.guestReport.title')}</span>}
      description={t('nativeAndroid.guestReport.description')}
      closeLabel={t('nativeAndroid.guestReport.close')} onDismiss={onDismiss}>
      <div className="native-guest-report__actions">
        <Link to="/report?source=guest" onClick={onDismiss} className="native-guest-report__continue">
          {t('nativeAndroid.guestReport.continue')}
        </Link>
        <Link to="/login?returnTo=%2Freport" onClick={onDismiss} className="native-guest-report__sign-in">
          {t('nativeAndroid.home.signInShort')}
        </Link>
      </div>
    </NativeBottomSheet>
  );
}
