import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GovAssistantContext } from './govAssistantContext';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, Info, Minus, RotateCcw, Square, X } from 'lucide-react';
import AiBrandMark from '../AiBrandMark';
import { GOV_ROLES } from '../ProtectedRoute';
import { getAuthToken, getAuthUser } from '../../utils/authSession';
import { governmentRequest } from '../../utils/governmentApi';
import './gov-assistant.css';

const STARTERS = [
    ['Explain dashboard KPIs', 'Explain the difference between open reports and current work orders, and how I should use these KPIs.'],
    ['Help review a report', 'Give me a practical checklist for reviewing an infrastructure report before assigning work.'],
    ['Draft a work update', 'Help me draft a short maintenance progress update. Ask for the non-confidential details you need.'],
];

function pageContext(path) {
    if (/\/overview|\/bi-dashboard/.test(path)) return 'overview';
    if (/\/dashboard|\/my-work/.test(path)) return 'my_work';
    if (/\/reports/.test(path)) return 'reports';
    if (/\/work-orders/.test(path)) return 'work_orders';
    if (/\/projects/.test(path)) return 'projects';
    if (/\/assets/.test(path)) return 'assets';
    if (/\/records/.test(path)) return 'records';
    if (/\/insights/.test(path)) return 'insights';
    if (/\/announcements/.test(path)) return 'updates';
    if (/\/account/.test(path)) return 'account';
    if (/\/administration/.test(path)) return 'administration';
    return 'workspace';
}

// Keep complete recent pairs. Older messages stay visible but leave model context.
function recentHistory(messages) {
    let start = Math.max(0, messages.length - 21);
    if (start % 2) start += 1;
    while (start < messages.length - 1 && messages.slice(start).reduce((sum, item) => sum + item.content.length, 0) > 28000) start += 2;
    return messages.slice(start).map(({ role, content }) => ({ role, content }));
}

function Conversation({ host, embedded }) {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [failed, setFailed] = useState(null);
    const [unread, setUnread] = useState(false);
    const launcher = useRef(null);
    const input = useRef(null);
    const panel = useRef(null);
    const log = useRef(null);
    const request = useRef(null);
    const openRef = useRef(false);
    const busy = useRef(false);
    const previousPath = useRef(location.pathname);
    const visible = embedded || open;

    useEffect(() => {
        openRef.current = visible;
        if (visible) {
            setUnread(false);
        }
        if (open && !embedded) {
            const dialog = panel.current;
            const media = window.matchMedia('(max-width:639px), (max-height:500px)');
            const show = () => {
                if (dialog.open) dialog.close();
                if (media.matches) dialog.showModal(); else dialog.show();
                input.current?.focus();
            };
            show();
            media.addEventListener('change', show);
            setUnread(false);
            return () => { media.removeEventListener('change', show); dialog.close(); };
        }
    }, [open, embedded, visible, host, location.pathname]);

    useEffect(() => {
        if (previousPath.current !== location.pathname) {
            setOpen(false);
            previousPath.current = location.pathname;
        }
    }, [location.pathname]);

    useEffect(() => {
        if (visible && log.current) log.current.scrollTop = log.current.scrollHeight;
    }, [messages, pending, error, visible, host]);

    useEffect(() => () => request.current?.abort(), []);

    useEffect(() => {
        const field = input.current;
        if (field) {
            field.style.height = 'auto';
            field.style.height = `${Math.min(120, field.scrollHeight)}px`;
        }
    }, [draft, visible, host]);

    function close() {
        setOpen(false);
        launcher.current?.focus();
    }

    async function send(retry = false) {
        const text = draft.trim();
        if (busy.current || (!retry && (!text || text.length > 4000))) return;
        const history = retry ? failed : [...messages, { role: 'user', content: text }];
        if (!history) return;
        busy.current = true;
        const controller = new AbortController();
        request.current = controller;
        setMessages(history);
        setDraft('');
        setError('');
        setFailed(null);
        setPending(true);
        try {
            const result = await governmentRequest('/api/gov/assistant/messages', {
                method: 'POST', signal: controller.signal,
                body: { messages: recentHistory(history), page: pageContext(location.pathname) },
            });
            if (!result?.response) throw new Error('The assistant returned no answer. Try again.');
            if (controller.signal.aborted) return;
            setMessages([...history, { role: 'assistant', content: result.response, incomplete: result.incomplete }]);
            if (!openRef.current) setUnread(true);
        } catch (err) {
            if (!controller.signal.aborted) {
                setFailed(history);
                setError(err.status === 503 ? 'AI replies are unavailable right now. Your question is saved here; try again shortly.' : err.message || 'The connection failed. Try again.');
            }
        } finally {
            if (request.current === controller) {
                busy.current = false;
                setPending(false);
                request.current = null;
            }
        }
    }

    function stop() {
        request.current?.abort();
        request.current = null;
        busy.current = false;
        setPending(false);
        // Remove the unanswered turn so the user can edit and resend it.
        if (messages.at(-1)?.role === 'user') {
            setDraft(messages.at(-1).content);
            setMessages(messages.slice(0, -1));
        }
        setError('Response stopped. Your question is ready to edit or send again.');
        input.current?.focus();
    }

    function editFailed() {
        setDraft(failed.at(-1).content);
        setMessages(failed.slice(0, -1));
        setFailed(null);
        setError('');
        input.current?.focus();
    }

    function newConversation() {
        setMessages([]);
        setDraft('');
        setError('');
        setFailed(null);
        setUnread(false);
        input.current?.focus();
    }

    const Surface = embedded ? 'section' : 'dialog';
    const content = <div className="gov-assistant" data-open={visible} data-mode={embedded ? 'embedded' : 'floating'} data-has-messages={messages.length > 0}>
        {visible && <Surface ref={panel} id="gov-assistant-panel" className="gov-assistant__panel" aria-labelledby="gov-assistant-title"
            onCancel={event => { if (!embedded) { event.preventDefault(); close(); } }}
            onKeyDown={event => { if (!embedded && event.key === 'Escape') { event.stopPropagation(); close(); } }}>
            <header className="gov-assistant__header">
                <AiBrandMark />
                <div><h2 id="gov-assistant-title">PULSO assistant</h2></div>
                <details className="gov-assistant__about"><summary aria-label="About this assistant" title="About this assistant"><Info size={18} aria-hidden="true" /></summary><p>Advisory help without access to live records. Messages go to OpenAI; keep personal or confidential details out. This conversation clears on reload or sign-out.</p></details>
                <button type="button" onClick={newConversation} disabled={pending || !messages.length} aria-label="Start a new conversation" title="New conversation"><RotateCcw size={18} /></button>
                {!embedded && <button type="button" onClick={close} aria-label="Minimize assistant" title="Minimize"><Minus size={20} /></button>}
            </header>
            <div ref={log} className="gov-assistant__log" role="log" aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0}>
                {!messages.length && <div className="gov-assistant__welcome">
                    <h3>What can I help you with?</h3>
                    <p>Make sense of a KPI, plan a review, or draft your next update.</p>
                </div>}
                {messages.map((message, index) => <article key={index} className={`gov-assistant__message gov-assistant__message--${message.role}`}>
                    <p className="gov-assistant__speaker">{message.role === 'user' ? 'You' : 'PULSO assistant'}</p>
                    {message.role === 'user' ? <p className="gov-assistant__question">{message.content}</p> : <div className="gov-assistant__answer"><ReactMarkdown skipHtml disallowedElements={['img']} unwrapDisallowed>{message.content}</ReactMarkdown></div>}
                    {message.incomplete && <p className="gov-assistant__caption">Answer reached its length limit. Ask a follow-up to continue.</p>}
                </article>)}
                {pending && <p className="gov-assistant__waiting" role="status">Preparing an answer…</p>}
                {error && <div className="gov-assistant__error" role="alert"><p>{error}</p>{failed && <div><button type="button" onClick={() => send(true)}>Try again</button><button type="button" onClick={editFailed}>Edit question</button></div>}</div>}
            </div>
            <form className="gov-assistant__composer" onSubmit={event => { event.preventDefault(); send(); }}>
                <label htmlFor="gov-assistant-question" className="gov-assistant__sr-only">Your question</label>
                <textarea ref={input} id="gov-assistant-question" rows={2} value={draft} maxLength={4000} placeholder="Ask PULSO…" disabled={pending || Boolean(failed)}
                    onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
                    }} aria-describedby="gov-assistant-hint" />
                {pending ? <button type="button" className="gov-assistant__send" onClick={stop} aria-label="Stop response" title="Stop response"><Square size={17} /></button> : <button type="submit" className="gov-assistant__send" aria-label="Send question" title="Send question" disabled={!draft.trim() || Boolean(failed)}><ArrowUp size={21} /></button>}
            </form>
            {!messages.length && <div className="gov-assistant__starters">{STARTERS.map(([label, prompt]) => <button key={label} type="button" onClick={() => { setDraft(prompt); input.current?.focus(); }}>{label}</button>)}</div>}
            <p id="gov-assistant-hint" className="gov-assistant__hint">AI can make mistakes. Check answers before acting.</p>
        </Surface>}
        {!embedded && <button ref={launcher} type="button" className="gov-assistant__launcher" data-idle={!open} onClick={() => { if (open) close(); else setOpen(true); }}
            aria-label={`${open ? 'Minimize' : 'Open'} PULSO assistant${unread ? ', new answer' : ''}`} aria-expanded={open} aria-controls={open ? 'gov-assistant-panel' : undefined} title="Ask PULSO assistant">
            {open ? <X size={24} aria-hidden="true" /> : <AiBrandMark />}
            {unread && <span className="gov-assistant__unread" aria-hidden="true" />}
        </button>}
    </div>;
    return embedded ? host && createPortal(content, host) : content;
}

export default function GovAssistant() {
    const location = useLocation();
    const [, refreshAuth] = useState(0);
    useEffect(() => {
        const update = () => refreshAuth(value => value + 1);
        window.addEventListener('storage', update);
        return () => window.removeEventListener('storage', update);
    }, []);
    const { host } = useContext(GovAssistantContext);
    const embedded = location.pathname === '/gov/overview';
    const user = getAuthUser();
    const token = getAuthToken();
    if (!location.pathname.startsWith('/gov/') || location.pathname === '/gov/activate' || !token || !GOV_ROLES.includes(user?.role)) return null;
    return <div className="gov-experience"><Conversation key={`${user.id}:${token}`} host={host} embedded={embedded} /></div>;
}
