import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/apiFetch';

/** The request comes exclusively from the resident-authorized public timeline. */
export default function ResidentInformationReply({ report, activity, onSubmitted, onRefreshReport }) {
    const { t, i18n } = useTranslation();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const pending = useRef(null);
    useEffect(() => () => pending.current?.abort(), []);
    const request = [...(activity.data || [])]
        .filter(event => event.status === 'needs_information')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)[0];
    const canReply = !activity.loading && !activity.error && request && !sent;

    async function sendInformation(event) {
        event.preventDefault();
        if (pending.current || !canReply) return;
        if (message.trim().length < 10) { setError('tooShort'); return; }
        const controller = new AbortController();
        pending.current = controller;
        setSending(true);
        setError('');
        const result = await apiFetch('/api/reports/information-reply', {
            method: 'POST', signal: controller.signal,
            body: JSON.stringify({ ticket_id: report.ticket_id, message: message.trim() }),
        });
        if (controller.signal.aborted) return;
        pending.current = null;
        setSending(false);
        if (result.ok) {
            setSent(true);
            onSubmitted(result.data);
        } else {
            const errors = { 401: 'expired', 403: 'denied', 404: 'unavailable', 409: 'changed', 429: 'rateLimit' };
            setError(errors[result.status] || 'sendFailed');
        }
    }

    return <section aria-labelledby="information-request-heading" className="select-text bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 min-w-0">
        <h2 id="information-request-heading" className="font-bold text-lg text-slate-900 dark:text-white">{t('informationReply.title')}</h2>
        {activity.loading ? <p role="status">{t('informationReply.loading')}</p>
            : activity.error || !request ? <div role="alert" className="space-y-2">
                <p>{t('informationReply.loadError')}</p>
                <button type="button" onClick={activity.reload} className="min-h-11 underline focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2">{t('reportLink.retry')}</button>
            </div> : <>
                <p className="whitespace-pre-wrap break-words text-base text-slate-800 dark:text-slate-100">{request.note}</p>
                {request.created_at && <time dateTime={request.created_at} className="block text-sm text-slate-600 dark:text-slate-300">{new Date(request.created_at).toLocaleString(i18n.language.startsWith('tl') ? 'fil-PH' : 'en-PH')}</time>}
            </>}
        {canReply && <form onSubmit={sendInformation} className="space-y-3" aria-busy={sending}>
            <label htmlFor="report-information-reply" className="block font-semibold text-slate-900 dark:text-white">{t('informationReply.label')}</label>
            <p id="information-reply-hint" className="text-sm text-slate-600 dark:text-slate-300">{t('informationReply.hint')}</p>
            <textarea id="report-information-reply" value={message} onChange={event => setMessage(event.target.value)}
                required minLength={10} maxLength={2000} rows={4} disabled={sending}
                aria-invalid={Boolean(error)} aria-describedby={`information-reply-hint${error ? ' information-reply-error' : ''}`}
                className="block w-full min-w-0 resize-y rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 p-3 text-base text-slate-900 dark:text-white focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 disabled:opacity-60"/>
            {error && <p id="information-reply-error" role="alert" className="text-sm text-red-700 dark:text-red-300">{t(`informationReply.${error}`)}</p>}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={sending} className="min-h-11 rounded-xl px-5 py-2 font-semibold bg-[#B9380B] text-white hover:bg-[#972E09] disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2">{t(sending ? 'informationReply.sending' : 'informationReply.send')}</button>
                {error && error !== 'tooShort' && <button type="button" onClick={() => { activity.reload(); onRefreshReport?.(); }} className="min-h-11 underline focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2">{t('informationReply.refresh')}</button>}
            </div>
        </form>}
    </section>;
}
