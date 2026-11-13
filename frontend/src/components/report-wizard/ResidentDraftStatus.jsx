import {useTranslation} from 'react-i18next';

export default function ResidentDraftStatus({draft,pending=false,recovering=false,onRecover}) {
    const {t}=useTranslation();
    const error=['load_error','save_error','conflict'].includes(draft.status);
    return <div className="resident-draft-status" style={{padding:'12px 16px',borderBottom:'1px solid var(--color-slate-200,#cbd5e1)'}}>
        <p className="text-sm text-slate-700 dark:text-slate-200" role={error?'alert':'status'} aria-live="polite">
            {t(`residentDraft.${pending?'pending':draft.status}`)}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
            {error&&<button type="button" className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-white focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                onClick={()=>void(draft.status==='save_error'?draft.flush():draft.reload()).catch(()=>{})}>
                {t(draft.status==='conflict'?'residentDraft.loadSaved':'residentDraft.retry')}
            </button>}
            {pending&&onRecover&&<button type="button" disabled={recovering} onClick={onRecover}
                className="min-h-11 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-orange-500">
                {t(recovering?'residentDraft.recovering':'residentDraft.recover')}
            </button>}
        </div>
    </div>;
}
