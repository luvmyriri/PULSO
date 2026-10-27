import { createElement } from 'react';
import { ChevronDown, FileText, Megaphone, Newspaper, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PUBLICATION_INPUT='gov-inset min-h-10 w-full min-w-0 rounded-lg border border-[var(--gov-rule)] bg-[var(--gov-surface)] px-3 py-2.5 text-sm font-normal leading-5 text-[var(--gov-text)] placeholder:text-[var(--gov-text-secondary)] transition-colors hover:border-[var(--gov-text-secondary)] focus:border-[var(--workspace-accent)] focus:outline-3 focus:outline-offset-2 focus:outline-[var(--workspace-focus)] disabled:cursor-not-allowed disabled:bg-[var(--gov-surface-subtle)] disabled:opacity-60 motion-reduce:transition-none [color-scheme:light] dark:[color-scheme:dark]';
export const PUBLICATION_LABEL='grid min-w-0 gap-2 text-xs font-semibold text-[var(--gov-text)]';

export function PublicationButton({primary=false,quiet=false,to,children,className='',...props}){
    const classes=`gov-control ${primary?'gov-control--primary':quiet?'gov-control--quiet':''} inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold leading-5 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-focus)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${primary?'border-transparent bg-[var(--workspace-accent)] text-[var(--workspace-on-accent)] hover:brightness-95':quiet?'border-transparent bg-transparent text-[var(--gov-text-secondary)] hover:bg-[var(--gov-surface-subtle)] hover:text-[var(--gov-text)]':'border-[var(--gov-rule)] bg-[var(--gov-surface)] text-[var(--gov-text)] hover:bg-[var(--gov-surface-subtle)]'} ${className}`;
    return to?<Link className={classes} to={to} {...props}>{children}</Link>:<button type="button" className={classes} {...props}>{children}</button>;
}

export function PublicationSelect({label,children,className='',...props}){
    return <label className={PUBLICATION_LABEL}>{label}<span className="relative block"><select className={`${PUBLICATION_INPUT} appearance-none pr-10 ${className}`} {...props}>{children}</select><ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gov-text-secondary)]"/></span></label>;
}

export function PublicationAccordion({title,icon:Icon=FileText,summary,children,open=false}){
    return <details className="group border-b border-[var(--gov-rule)] py-5 first:pt-0 last:border-b-0" open={open||undefined}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-md text-[13px] font-semibold text-[var(--gov-text)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-focus)] [&::-webkit-details-marker]:hidden">{createElement(Icon,{size:16,'aria-hidden':true,className:'shrink-0 text-[var(--gov-text-secondary)]'})}<span className="flex-1">{title}</span>{summary&&<span className="max-w-28 truncate text-[11px] font-normal text-[var(--gov-text-secondary)]">{summary}</span>}<ChevronDown size={15} aria-hidden="true" className="shrink-0 text-[var(--gov-text-secondary)] transition-transform group-open:rotate-180 motion-reduce:transition-none"/></summary>
        <div className="space-y-4 pt-4">{children}</div>
    </details>;
}

export function PublicationFormat({value,compact=false}){
    const Icon=value==='news'?Newspaper:value==='advisory'?TriangleAlert:Megaphone;
    return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] text-[var(--gov-text-secondary)] ${compact?'h-9 w-9':'h-11 w-11'}`}><Icon size={compact?16:20} aria-hidden="true"/></span>;
}
