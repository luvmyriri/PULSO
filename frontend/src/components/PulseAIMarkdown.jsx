import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * PulseAIMarkdown
 * Renders assistant messages with structured markdown formatting,
 * matching PULSO's typography (Space Grotesk / JetBrains Mono / sans).
 * Supports bold, bullet & numbered lists, headings, inline code, and tables.
 */
export default function PulseAIMarkdown({ content }) {
    if (!content) return null;

    return (
        <div className="pulseai-markdown text-[13px] leading-relaxed break-words font-sans space-y-2">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-slate-900 dark:text-white" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                        <em className="italic text-slate-800 dark:text-slate-200" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-5 my-2 space-y-1.5 text-slate-800 dark:text-slate-200 marker:text-[#f05a00]" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1.5 text-slate-800 dark:text-slate-200 marker:text-[#f05a00] marker:font-semibold" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                        <li className="leading-relaxed pl-0.5" {...props} />
                    ),
                    h1: ({ node, ...props }) => (
                        <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-700/60" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-[11px] font-bold text-[#ea580c] dark:text-orange-400 uppercase tracking-wider mt-2 mb-1" {...props} />
                    ),
                    code: ({ node, inline, ...props }) => {
                        return inline ? (
                            <code
                                className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-slate-200/80 dark:bg-slate-700/80 text-[#ea580c] dark:text-orange-300 font-semibold"
                                {...props}
                            />
                        ) : (
                            <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto my-2 border border-slate-700/80">
                                <code {...props} />
                            </pre>
                        );
                    },
                    blockquote: ({ node, ...props }) => (
                        <blockquote
                            className="border-l-3 border-[#f05a00] pl-3 py-1 my-2 text-slate-600 dark:text-slate-400 italic text-xs bg-orange-50/40 dark:bg-slate-800/40 rounded-r"
                            {...props}
                        />
                    ),
                    a: ({ node, href, children, ...props }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ea580c] dark:text-orange-400 font-semibold underline underline-offset-2 hover:text-[#c2410c] transition-colors"
                            {...props}
                        >
                            {children}
                        </a>
                    ),
                    table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-2 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <table className="min-w-full text-xs divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-slate-100 dark:bg-slate-700/60 font-semibold text-slate-900 dark:text-white" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="px-2.5 py-1.5 text-left font-semibold text-[11px] uppercase tracking-wider" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="px-2.5 py-1.5 border-t border-slate-200 dark:border-slate-700 text-[12px]" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                        <hr className="my-2.5 border-slate-200 dark:border-slate-700/80" {...props} />
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
