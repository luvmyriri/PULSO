import { useTranslation } from 'react-i18next';
import { TrackReportContent } from '../../pages/PublicTrackPage';
import NativeBottomSheet from './NativeBottomSheet';
import './native-track-sheet.css';

export default function NativeTrackSheet({ onDismiss }) {
  const { t } = useTranslation();
  return (
    <NativeBottomSheet title={t('track.header.title')} description={t('track.lookup.sheetSubtitle')}
      closeLabel={t('track.lookup.closeSheet')} onDismiss={onDismiss} className="native-track-sheet">
      <TrackReportContent inSheet />
    </NativeBottomSheet>
  );
}
