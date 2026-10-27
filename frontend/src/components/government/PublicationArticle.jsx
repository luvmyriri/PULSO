import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import './publication-article.css';

function DocumentView({ file, draftId, language }) {
    const [source, setSource] = useState({ url: '', error: '' });
    useEffect(() => {
        if (!draftId) return;
        const controller = new AbortController();
        let objectUrl;
        fetch(`${API_BASE_URL}/api/gov/announcements/${draftId}/attachments/${file.id}`, { headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: controller.signal })
            .then(async response => { if (!response.ok) throw new Error('The document preview could not be loaded.'); objectUrl = URL.createObjectURL(await response.blob()); setSource({ url: objectUrl, error: '' }); })
            .catch(error => { if (error.name !== 'AbortError') setSource({ url: '', error: error.message }); });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [draftId, file.id]);
    const url = draftId ? source.url : `${API_BASE_URL}${file.url}`;
    const image = file.media_type.startsWith('image/');
    const pdf = file.media_type === 'application/pdf';
    return <figure className="publication-document">
        <figcaption><FileText size={18} /><span><strong>{file.caption}</strong><small>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small></span></figcaption>
        {source.error ? <p role="alert">{language === 'fil' ? 'Hindi makuha ang preview ng dokumento.' : source.error}</p> : !url ? <p role="status">{language === 'fil' ? 'Kinukuha ang dokumento…' : 'Loading document…'}</p> : <>
            {image && <img loading="lazy" src={url} alt={file.caption} />}
            {pdf && <iframe loading="lazy" src={url} title={file.caption} className="publication-pdf" />}
            <a href={url} target="_blank" rel="noreferrer" download={!pdf && !image ? file.name : undefined}>{language === 'fil' ? (pdf || image ? 'Buksan nang buo' : 'I-download ang dokumento') : (pdf || image ? 'Open full document' : 'Download document')} <ExternalLink size={14} /></a>
        </>}
    </figure>;
}

export default function PublicationArticle({ item, language = 'en', draftId }) {
    const fil = language === 'fil';
    const details = item.publication_details || {};
    const translated = fil && item.content_fil;
    const title = fil && item.title_fil ? item.title_fil : item.title_en;
    const summary = translated ? details.summary_fil : details.summary_en;
    const action = translated ? details.action_fil : details.action_en;
    const date = value => new Date(value).toLocaleString(fil ? 'fil-PH' : 'en-PH', { dateStyle: 'long', timeStyle: 'short' });
    return <div className="publication-article">
        <p className="publication-eyebrow">{({ advisory: fil ? 'Abiso' : 'Advisory', news: fil ? 'Balita' : 'News', announcement: fil ? 'Anunsyo' : 'Announcement' })[item.publication_format]}{item.priority !== 'normal' && <> · {item.priority === 'urgent' ? (fil ? 'Mahalaga' : 'Urgent') : (fil ? 'Emerhensiya' : 'Emergency')}</>}</p>
        <h1>{title || (fil ? 'Pamagat ng update' : 'Your update headline')}</h1>
        {summary && <p className="publication-deck">{summary}</p>}
        <div className="publication-byline">{details.issuing_office && <span>{details.issuing_office}</span>}{item.published_at ? <time dateTime={item.published_at}>{date(item.published_at)}</time> : <span>{fil ? 'Preview lamang · hindi pa inilalathala' : 'Draft preview · unpublished'}</span>}</div>
        {fil && !translated && <p className="publication-translation" role="note">Wala pang nasuring salin sa Filipino. Ipinapakita ang orihinal na nilalaman sa English.</p>}
        {(item.target_barangays?.length > 0 || details.effective_from) && <dl className="publication-facts">
            {item.target_barangays?.length > 0 && <div><dt>{fil ? 'Sakop na lugar' : 'Affected areas'}</dt><dd>{item.target_barangays.join(', ')}</dd></div>}
            {details.effective_from && <div><dt>{fil ? 'Iskedyul' : 'Effective period'}</dt><dd>{date(details.effective_from)}{details.effective_until && <> – {date(details.effective_until)}</>}</dd></div>}
        </dl>}
        <div className="publication-prose" lang={translated ? 'fil' : 'en'}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ alt }) => <span>{alt}</span>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{(translated ? item.content_fil : item.content_en) || (fil ? 'Nilalaman ng update.' : 'Your article will appear here as you write.')}</ReactMarkdown></div>
        {action && <section className="publication-action"><h2>{fil ? 'Ano ang dapat gawin' : 'What residents should do'}</h2><p>{action}</p></section>}
        {item.attachments?.length > 0 && <section className="publication-documents"><h2>{fil ? 'Mga opisyal na dokumento' : 'Official documents'}</h2>{item.attachments.map(file => <DocumentView key={file.id} file={file} draftId={draftId} language={language} />)}</section>}
    </div>;
}
