import { useTranslation } from 'react-i18next';
import { isNativeAndroid } from '../utils/appContext';
import NativeAppHeader from '../components/mobile/NativeAppHeader';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import PublicationArticle from '../components/government/PublicationArticle';
import ThemeToggle from '../components/ThemeToggle';
import { getAuthUser } from '../utils/authSession';
import { useGovernmentData } from '../utils/governmentApi';
import './public-updates.css';

const COPY = {
    en: { updates: 'City updates', home: 'Home', title: 'Official updates from the city', loading: 'Loading updates…', error: 'This update could not be loaded.', retry: 'Try again', empty: 'No public updates are available yet.', date: 'Published', related: 'About your report', signin: 'Sign in to see whether this update relates to your own report.', login: 'Resident sign in', private: 'Only you can see your report links here.', budget: 'Budget disclosure', noBudget: 'No budget amount is disclosed in this update.', caveat: 'A disclosed budget is a sourced public fact. It is not proof of actual spending or authority to spend.', source: 'Source', sourceDate: 'Source date', bids: 'View official bidding opportunities', translation: 'A reviewed Filipino translation has not been provided for this update. The original English content is shown.', report: 'Open my report', unchanged: 'Publication does not change your report status.', contextError: 'Your private report context could not be loaded. Try again.', noLink: 'No reviewed link to a report you own is currently recorded.', corrections: 'Corrections' },
    fil: { updates: 'Mga update ng lungsod', home: 'Home', title: 'Mga opisyal na update mula sa lungsod', loading: 'Kinukuha ang mga update…', error: 'Hindi makuha ang update na ito.', retry: 'Subukan muli', empty: 'Wala pang pampublikong update.', date: 'Inilathala', related: 'Tungkol sa iyong ulat', signin: 'Mag-sign in upang makita kung may kaugnayan ang update sa iyong sariling ulat.', login: 'Mag-sign in bilang residente', private: 'Ikaw lamang ang makakakita ng mga link sa iyong ulat dito.', budget: 'Impormasyon sa badyet', noBudget: 'Walang halagang badyet na inilathala sa update na ito.', caveat: 'Ang inilathalang badyet ay impormasyong mula sa tinukoy na opisyal na sanggunian. Hindi ito patunay ng aktuwal na gastos o awtoridad na gumastos.', source: 'Sanggunian', sourceDate: 'Petsa ng sanggunian', bids: 'Tingnan ang opisyal na mga paanyaya sa pag-bid', translation: 'Wala pang nasuring salin sa Filipino para sa update na ito. Ipinapakita ang orihinal na nilalaman sa English.', report: 'Buksan ang aking ulat', unchanged: 'Hindi binabago ng paglalathala ang status ng iyong ulat.', contextError: 'Hindi makuha ang pribadong kaugnayan sa iyong ulat. Subukan muli.', noLink: 'Walang naitalang nasuring kaugnayan sa ulat na pag-aari mo sa kasalukuyan.', corrections: 'Mga pagwawasto' },
};
const AMOUNT_LABELS = { approved_budget_for_contract: ['Approved budget for the contract (ABC)', 'Aprubadong badyet para sa kontrata (ABC)'], contract_award_amount: ['Awarded contract amount', 'Halaga ng iginawad na kontrata'], allocated_project_budget: ['Project allocation', 'Inilaang badyet sa proyekto'], maintenance_allocation: ['Maintenance allocation', 'Inilaang badyet sa pagpapanatili'] };

export default function PublicUpdatesPage() {
    const { updateId } = useParams();
    const { i18n } = useTranslation();
    const [params, setParams] = useSearchParams();
    const language = params.get('lang') === 'fil' || (isNativeAndroid() && i18n.resolvedLanguage === 'tl') ? 'fil' : 'en';
    const copy = COPY[language];
    const user = getAuthUser();
    const resident = user?.role === 'resident';
    const { data, loading, error, reload } = useGovernmentData(`/api/announcements${updateId ? `/${updateId}` : ''}`);
    const context = useGovernmentData(updateId && resident ? `/api/announcements/${updateId}/my-report-context` : null);
    const date = value => new Date(value).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-PH', { dateStyle: 'long', timeStyle: 'short' });
    const title = item => language === 'fil' && item.title_fil ? item.title_fil : item.title_en;
    return <>
        {isNativeAndroid() && <NativeAppHeader onLanguageChange={language => {
            const next = new URLSearchParams(params);
            next.set('lang', language === 'tl' ? 'fil' : 'en');
            setParams(next);
        }} />}
        <div className="public-updates-page" lang={language === 'fil' ? 'fil' : 'en'}>
        {!isNativeAndroid() && (
        <header><Link to="/resident-home" className="public-updates-brand">PULSO <span>Caloocan City</span></Link><nav aria-label="Page navigation"><Link to="/resident-home">{copy.home}</Link><button aria-pressed={language === 'en'} onClick={() => setParams({ lang: 'en' })}>English</button><button aria-pressed={language === 'fil'} onClick={() => setParams({ lang: 'fil' })}>Filipino</button><ThemeToggle responsiveBreakpoint="xl" /></nav></header>
        )}
        <main>{updateId && <Link to={`/updates?lang=${language}`} className="public-updates-back"><ArrowLeft size={16} />{copy.updates}</Link>}
            {loading ? <p role="status">{copy.loading}</p> : error ? <section role="alert"><h1>{copy.error}</h1><button onClick={reload}>{copy.retry}</button></section> : !updateId ? <><h1>{copy.title}</h1>{!data?.length && <p>{copy.empty}</p>}<ul className="public-update-list">{(data || []).map(item => <li key={item.id}><span>{item.publication_format} · {date(item.published_at)}</span><h2><Link to={`/updates/${item.id}?lang=${language}`}>{title(item)}</Link></h2><p>{(language === 'fil' && item.content_fil ? item.content_fil : item.content_en).slice(0, 220)}</p></li>)}</ul></> : data && <article>
                <PublicationArticle item={data} language={language} />
                <section className="public-update-context"><h2>{copy.related}</h2><p>{copy.private}</p>{resident ? context.loading ? <p role="status">{copy.loading}</p> : context.error ? <p role="alert">{copy.contextError} <button onClick={context.reload}>{copy.retry}</button></p> : <>{context.data?.associated_reports?.length ? <ul>{context.data.associated_reports.map(r => <li key={r.report_id}><p>{language === 'fil' ? r.label_fil : r.label_en}</p><Link to={`/dashboard?tab=reports&reportId=${r.report_id}`}>{copy.report}: {r.ticket_id}</Link></li>)}</ul> : <p>{copy.noLink}</p>}<p>{copy.unchanged}</p></> : <><p>{copy.signin}</p><Link to={`/login?returnTo=${encodeURIComponent(`/updates/${data.id}?lang=${language}`)}`}>{copy.login}</Link></>}</section>
                {data.budget_disclosure && <section><h2>{copy.budget}</h2><p><strong>{Number(data.budget_disclosure.amount).toLocaleString(language === 'fil' ? 'fil-PH' : 'en-PH', { style: 'currency', currency: data.budget_disclosure.currency })}</strong> · {AMOUNT_LABELS[data.budget_disclosure.amount_type]?.[language === 'fil' ? 1 : 0] || data.budget_disclosure.amount_type}</p><p>{copy.source}: <a href={data.budget_disclosure.source_url} target="_blank" rel="noreferrer">{data.budget_disclosure.source_label} <ExternalLink size={14} /></a></p><p>{copy.sourceDate}: {data.budget_disclosure.source_date}</p><p>{data.budget_disclosure.scope_caveat}</p><p>{copy.caveat}</p><a href="https://caloocancity.gov.ph/invitation-to-bid/" target="_blank" rel="noreferrer">{copy.bids} <ExternalLink size={14} /></a></section>}
                {data.corrections?.length > 0 && <section><h2>{copy.corrections}</h2><ul>{data.corrections.map((c, i) => <li key={i}>{c.summary} · {date(c.created_at)}</li>)}</ul></section>}
            </article>}
        </main>
    </div></>;
}
