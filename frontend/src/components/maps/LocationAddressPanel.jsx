import React from 'react';
import { useTranslation } from 'react-i18next';
import { displayAddressFields, normalizeDisplayAddress } from '../../utils/locationPrivacy';
import LocationCoordinates from './LocationCoordinates';

/** Shared by the reporting panel and any marker popup; React escapes all values. */
export default function LocationAddressPanel({ address, coordinates, showCoordinates = true, gpsAddress = false, loading = false, showPlusCode = false, hideTitle = false }) {
    const { t } = useTranslation();
    const fields = displayAddressFields(address, coordinates, { preferAddress: gpsAddress });
    const plusCode = normalizeDisplayAddress(address, coordinates).plusCode;
    // The camera-first flow needs one complete, copyable public address. Start
    // with the area Plus Code, then retain any detected village/subdivision.
    const visibleFields = showPlusCode
        ? [...(plusCode ? [['plusCode', plusCode]] : []), ...fields.filter(([field]) => field !== 'plusCode')]
        : fields;
    const hasStreet = fields.some(([field]) => field === 'street');
    const title = t(gpsAddress && hasStreet ? 'locationPrivacy.mappedAddress' : 'locationPrivacy.title');
    const hasCoordinates = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
        && Math.abs(coordinates.lat) <= 90 && Math.abs(coordinates.lng) <= 180;
    let message = '';
    if (loading) message = t(gpsAddress ? 'locationPrivacy.gpsAddressLoading' : 'locationPrivacy.loading');
    else if (!fields.length && !hasCoordinates) message = t('locationPrivacy.empty');
    return (
        <section className="min-w-0 max-w-full flex-1 space-y-2 text-slate-900 dark:text-slate-100" aria-label={title} aria-busy={loading}>
            {!hideTitle && <h3 className="text-sm font-bold">{title}</h3>}
            {visibleFields.length > 0 && (
                <p className="min-w-0 break-words text-sm font-bold leading-snug select-text">
                    {visibleFields.map(([field, value], index) => (
                        <React.Fragment key={field}>
                            {index > 0 ? ', ' : ''}
                            {field === 'plusCode'
                                ? <strong className="font-extrabold" aria-label={`${t('locationPrivacy.fields.plusCodeLabel')} ${value}`}>{value}</strong>
                                : value}
                        </React.Fragment>
                    ))}
                </p>
            )}
            {showCoordinates && <LocationCoordinates coordinates={coordinates} />}
            <p role="status" className={message ? 'text-xs leading-5 text-slate-600 dark:text-slate-300' : 'sr-only'}>
                {message}
            </p>
        </section>
    );
}
