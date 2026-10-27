import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGovernmentData } from '../../utils/governmentApi';
import { ArrowRight, Megaphone } from 'lucide-react';
import { residentPublication } from '../../utils/publicationAdapter';
import { API_BASE_URL } from '../../utils/apiBase';

export default function CityUpdatesSection() {
    const { i18n } = useTranslation();
    const fil = i18n.language?.startsWith('fil') || i18n.language?.startsWith('tl');
    const { data, loading, error, reload } = useGovernmentData('/api/announcements?limit=4');
    const updates = (data || []).map(item => residentPublication(item, i18n.language));
    return <section id="city-updates" aria-label={fil ? 'Mga update ng lungsod' : 'City updates'} className="py-10 sm:py-14 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12"><div className="flex items-center justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{fil ? 'Mga update ng lungsod' : 'City updates'}</h2><p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{fil ? 'Mga inilathalang anunsiyo, abiso at balita mula sa lungsod.' : 'Published announcements, advisories and news from the city.'}</p></div><Link to={`/updates?lang=${fil ? 'fil' : 'en'}`} className="min-h-11 inline-flex items-center text-sm font-semibold text-[#b9380b] dark:text-orange-300 underline underline-offset-4">{fil ? 'Lahat ng update' : 'All updates'}</Link></div>
            {loading ? <p role="status">{fil ? 'Kinukuha ang mga update…' : 'Loading updates…'}</p> : error ? <p role="alert">{fil ? 'Hindi makuha ang mga update.' : 'Updates could not be loaded.'} <button className="underline min-h-11" onClick={reload}>{fil ? 'Subukan muli' : 'Try again'}</button></p> : !updates.length ? <p className="text-slate-600 dark:text-slate-300">{fil ? 'Wala pang pampublikong update.' : 'No public updates are available yet.'}</p> : <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {updates.map(item => <li key={item.id} className="min-w-0">
                    <Link to={item.public_url} className="group flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                        {item.image_url ? <img src={item.image_url.startsWith('/') ? `${API_BASE_URL}${item.image_url}` : item.image_url} alt="" loading="lazy" className="w-full aspect-video object-cover"/> : <div className="aspect-video flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-[#b9380b] dark:text-orange-300"><Megaphone size={32} aria-hidden="true"/></div>}
                        <div className="p-4 space-y-2"><p className="text-xs text-slate-600 dark:text-slate-300">{item.publication_format} · {new Date(item.published_at).toLocaleDateString(fil ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' })}</p>
                            <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:underline break-words">{item.title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{item.description}</p>
                            <ArrowRight size={16} aria-hidden="true"/></div>
                    </Link>
                </li>)}
            </ul>}
        </div>
    </section>;
}
