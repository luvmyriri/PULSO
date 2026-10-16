/**
 * PulseAIChatWindow.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified PULSEAI Assistant Component for both Residents and Government Staff.
 *
 * Implements:
 *   - Shared PULSO Orange branding and visual design tokens (Space Grotesk / Inter)
 *   - Role-specific configuration (Resident vs. Staff)
 *   - Grounded tool calls via /api/pulseai/conversations
 *   - Persistent per-account chat history, thread creation, and thread deletion
 *   - Markdown formatting with PulseAIMarkdown
 *   - Compact floating panel (400x580) with expand toggle & mobile sheet
 *   - WCAG 2.2 AA accessibility: focus trap/return, Escape close, aria-live polite
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    X,
    Maximize2,
    Minimize2,
    Send,
    Plus,
    History,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Loader2,
    MessageSquare,
    AlertTriangle,
    Clock,
    PhoneCall,
    Compass,
    CheckCircle2,
    Wrench,
    FileText
} from 'lucide-react';
import PulseAIMarkdown from './PulseAIMarkdown';
import { API_BASE_URL } from '../utils/apiBase';
import { apiFetch } from '../utils/apiFetch';
import { getAuthToken, getAuthUser } from '../utils/authSession';

export default function PulseAIChatWindow({
    isOpen,
    onClose,
    role = 'resident', // 'resident' | 'staff'
    currentUser = null,
    triggerRef = null,
    onNavigate = null
}) {
    // Resolve authenticated user & role
    const resolvedUser = currentUser || getAuthUser() || {};
    const isStaff = role === 'staff' || (resolvedUser.role && resolvedUser.role !== 'resident');
    const token = getAuthToken();

    // User first name for plain language greeting
    const userFirstName = resolvedUser.first_name ||
        resolvedUser.full_name?.trim().split(/\s+/)[0] ||
        resolvedUser.name?.trim().split(/\s+/)[0] ||
        (isStaff ? 'Staff' : 'Citizen');

    // ── Window Sizing & Sub-view State ──
    const [isMaximized, setIsMaximized] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // ── Input & Messages State ──
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [deletingConvId, setDeletingConvId] = useState(null);

    // Default Greeting based on role
    const initialGreetingText = isStaff
        ? `Hi ${userFirstName}, how can I help today? You can check **unassigned reports**, **overdue work orders**, **reports needing verification**, or **today's priorities**.`
        : `Hi ${userFirstName}, how can I help today? You can ask about **how to file a report**, check your **report status**, inquire about **city emergency hotlines**, or view **active engineering advisories**.`;

    const [messages, setMessages] = useState([
        { role: 'assistant', text: initialGreetingText }
    ]);

    // ── Suggestion Chips Definition ──
    const staffChips = [
        { label: 'Unassigned reports', query: 'Show unassigned citizen reports' },
        { label: 'Overdue work', query: 'Check overdue work orders and SLA alerts' },
        { label: 'Needs verification', query: 'Which reports are awaiting verification?' },
        { label: "Today's priorities", query: "What are today's critical priority reports?" }
    ];

    const residentChips = [
        { label: 'How to file a report?', query: 'How to file a report?' },
        { label: 'My report status', query: 'What is the status of my reports?' },
        { label: 'City hotlines', query: 'What are the city emergency hotlines?' },
        { label: 'Evacuation routes', query: 'Where are the evacuation routes in Caloocan?' }
    ];

    const activeChips = isStaff ? staffChips : residentChips;

    // ── Suggestion Chips Scrolling ──
    const chipsScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollChevrons = useCallback(() => {
        if (!chipsScrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = chipsScrollRef.current;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }, []);

    const scrollChips = (dir) => {
        if (!chipsScrollRef.current) return;
        const offset = dir === 'left' ? -180 : 180;
        chipsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        setTimeout(updateScrollChevrons, 200);
    };

    // ── DOM Refs for Accessibility ──
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const windowRef = useRef(null);

    // Auto scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isHistoryOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isHistoryOpen]);

    // Focus input on open, return focus to trigger on close
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
                updateScrollChevrons();
            }, 80);
        } else if (triggerRef?.current) {
            triggerRef.current.focus();
        }
    }, [isOpen, triggerRef, updateScrollChevrons]);

    // Handle Escape key to close or restore
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                if (isHistoryOpen) {
                    setIsHistoryOpen(false);
                } else if (isMaximized) {
                    setIsMaximized(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isHistoryOpen, isMaximized, onClose]);

    // ── API: Load Conversations ──
    const fetchConversations = useCallback(async () => {
        if (!token) return;
        setLoadingConversations(true);
        try {
            const res = await apiFetch('/api/pulseai/conversations', { timeout: 6000 });
            if (res.ok && res.data?.conversations) {
                setConversations(res.data.conversations);
            }
        } catch (_) {
            // graceful fail without uncaught noise
        } finally {
            setLoadingConversations(false);
        }
    }, [token]);

    // ── API: Load Messages for a Conversation ──
    const loadConversation = useCallback(async (convId) => {
        if (!token || !convId) return;
        setIsLoading(true);
        try {
            const res = await apiFetch(`/api/pulseai/conversations/${convId}/messages`, { timeout: 8000 });
            if (res.ok && res.data?.messages) {
                setMessages(res.data.messages.map(m => ({
                    role: m.role,
                    text: m.content
                })));
                setActiveConversationId(convId);
                setIsHistoryOpen(false);
            }
        } catch (_) {
            // non-fatal
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Initialize or restore conversation when opened
    useEffect(() => {
        if (isOpen && token) {
            fetchConversations();
        }
    }, [isOpen, token, fetchConversations]);

    // ── API: Start New Chat Session ──
    const handleStartNewChat = () => {
        setActiveConversationId(null);
        setMessages([{ role: 'assistant', text: initialGreetingText }]);
        setQuery('');
        setIsHistoryOpen(false);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    // ── API: Delete a conversation ──
    const handleDeleteConversation = async (convId, e) => {
        e.stopPropagation();
        if (!token) return;
        setDeletingConvId(convId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setConversations(prev => prev.filter(c => c.id !== convId));
                if (activeConversationId === convId) {
                    handleStartNewChat();
                }
            }
        } catch (err) {
            console.warn('[PULSEAI] Delete conversation error:', err);
        } finally {
            setDeletingConvId(null);
        }
    };

    // ── API: Clear All Conversations ──
    const handleClearAllHistory = async () => {
        if (!token) return;
        if (!window.confirm('Clear all conversation history? This cannot be undone.')) return;
        try {
            const res = await apiFetch('/api/pulseai/conversations', { method: 'DELETE' });
            if (res.ok) {
                setConversations([]);
                handleStartNewChat();
            }
        } catch (_) {}
    };

    // ── API: Send Message & Receive Response ──
    const handleSendMessage = async (e, directText = null) => {
        if (e && e.preventDefault) e.preventDefault();
        const textToSend = (directText || query || '').trim();
        if (!textToSend || isLoading) return;

        // Append user message locally
        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setQuery('');
        setIsLoading(true);

        try {
            let convId = activeConversationId;

            // Create conversation session if needed
            if (!convId && token) {
                const createRes = await apiFetch('/api/pulseai/conversations', {
                    method: 'POST',
                    body: JSON.stringify({ title: textToSend.slice(0, 40) })
                });
                if (createRes.ok && createRes.data?.id) {
                    convId = createRes.data.id;
                    setActiveConversationId(convId);
                }
            }

            if (convId && token) {
                const postRes = await apiFetch(`/api/pulseai/conversations/${convId}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({
                        query: textToSend,
                        context: isStaff ? 'Government staff workspace session' : 'Resident portal session'
                    })
                });

                if (postRes.ok && postRes.data) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        text: postRes.data.response || "I could not load that information right now. You can check the Reports section for details."
                    }]);
                    fetchConversations();
                    return;
                }
            }

            // Connection failure: keep the typed text retryable in-chat without crashing
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "I couldn't connect. Try again in a moment.",
                retryText: textToSend,
            }]);
        } catch (_) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "I couldn't connect. Try again in a moment.",
                retryText: textToSend,
            }]);
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    return typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for Maximized Desktop */}
                        {isMaximized && (
                            <motion.div
                                key="pulseai-backdrop-max"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9998] pointer-events-auto cursor-pointer"
                                onClick={() => setIsMaximized(false)}
                            />
                        )}

                        {/* Mobile Backdrop for normal drawer mode */}
                        {!isMaximized && (
                            <motion.div
                                key="pulseai-backdrop-mobile"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="sm:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9998] pointer-events-auto"
                                onClick={onClose}
                            />
                        )}

                        {/* Chat Window Outer Positioning Container */}
                        <div
                            className={`fixed z-[9999] pointer-events-none transition-all duration-300 ${
                                isMaximized
                                    ? 'inset-0 flex items-center justify-center p-0 sm:p-4 lg:p-8'
                                    : 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 flex flex-col justify-end sm:justify-start items-end'
                            }`}
                        >
                            {/* Chat Window Panel */}
                            <motion.div
                                ref={windowRef}
                                key="pulseai-window"
                                role="dialog"
                                aria-modal="true"
                                aria-label={`PULSEAI ${isStaff ? 'Staff Assistant' : 'Community Helper'}`}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                className={`pointer-events-auto bg-white dark:bg-slate-900 shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative z-10 transition-all duration-300 ${
                                    isMaximized
                                        ? 'w-full h-full max-w-6xl max-h-full sm:max-h-[92vh] rounded-none sm:rounded-3xl'
                                        : 'w-full h-full sm:h-[580px] sm:w-[410px] md:w-[430px] rounded-none sm:rounded-2xl max-h-[100dvh] sm:max-h-[calc(100vh-3rem)]'
                                }`}
                            >
                        {/* ── HEADER ── */}
                        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#e65100] via-[#f97316] to-[#ea580c] flex justify-between items-center shrink-0 select-none shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-xs">
                                    <Brain size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-heading font-black text-white text-sm leading-tight tracking-tight">
                                            PULSEAI
                                        </h4>
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Operational" />
                                    </div>
                                    <p className="text-[10px] text-orange-100 font-bold uppercase tracking-wider truncate">
                                        {isStaff ? 'STAFF ASSISTANT' : 'COMMUNITY HELPER · 24/7'}
                                    </p>
                                </div>
                            </div>

                            {/* Header Window Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* New Chat */}
                                <button
                                    type="button"
                                    onClick={handleStartNewChat}
                                    title="Start New Chat"
                                    aria-label="New Chat"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <Plus size={17} strokeWidth={2.5} />
                                </button>

                                {/* Toggle History View */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsHistoryOpen(prev => {
                                            const next = !prev;
                                            if (next && conversations.length === 0) {
                                                fetchConversations();
                                            }
                                            return next;
                                        });
                                    }}
                                    title={isHistoryOpen ? 'Return to chat' : 'Past Conversations'}
                                    aria-label="Toggle Conversation History"
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                        isHistoryOpen ? 'bg-white/30 text-white shadow-xs' : 'text-white/90 hover:text-white hover:bg-white/20'
                                    }`}
                                >
                                    <History size={16} />
                                </button>

                                {/* Maximize / Minimize / Fullscreen */}
                                <button
                                    type="button"
                                    onClick={() => setIsMaximized(prev => !prev)}
                                    title={isMaximized ? 'Exit Full Screen' : 'Full Screen'}
                                    aria-label={isMaximized ? 'Exit Full Screen' : 'Full Screen'}
                                    className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>

                                {/* Close */}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    title="Close PULSEAI"
                                    aria-label="Close PULSEAI"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        {/* ── CONTENT BODY ── */}
                        {isHistoryOpen ? (
                            /* History Drawer View */
                            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
                                <div className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsHistoryOpen(false)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                            title="Back to conversation"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <div>
                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white">Chat History</h5>
                                            <p className="text-[10px] text-slate-400">
                                                {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleStartNewChat}
                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                    >
                                        <Plus size={13} strokeWidth={2.5} />
                                        <span>New Chat</span>
                                    </button>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                    {loadingConversations ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                                            <Loader2 size={24} className="animate-spin text-[#ea580c]" />
                                            <span className="text-xs font-medium">Loading conversations...</span>
                                        </div>
                                    ) : conversations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] dark:text-orange-400 flex items-center justify-center mb-3">
                                                <MessageSquare size={22} />
                                            </div>
                                            <h6 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">No saved conversations yet</h6>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[240px] mb-4">
                                                Inquiries and data queries will be safely archived here for your account.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleStartNewChat}
                                                className="px-3.5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                            >
                                                Start First Conversation
                                            </button>
                                        </div>
                                    ) : (
                                        conversations.map(conv => {
                                            const isActive = conv.id === activeConversationId;
                                            return (
                                                <div
                                                    key={conv.id}
                                                    onClick={() => loadConversation(conv.id)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                                                        isActive
                                                            ? 'bg-orange-50/90 dark:bg-orange-950/25 border-orange-300 dark:border-orange-800/60 shadow-xs'
                                                            : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/60 hover:border-orange-200 dark:hover:border-orange-900/40'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h6 className={`font-semibold text-xs leading-snug line-clamp-1 ${
                                                            isActive
                                                                ? 'text-orange-600 dark:text-orange-400 font-bold'
                                                                : 'text-slate-800 dark:text-slate-200 group-hover:text-orange-600'
                                                        }`}>
                                                            {conv.title || 'Conversation'}
                                                        </h6>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {isActive && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                                                                    Active
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                                                title="Delete conversation"
                                                                disabled={deletingConvId === conv.id}
                                                                className="opacity-70 group-hover:opacity-100 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 transition-all cursor-pointer"
                                                            >
                                                                {deletingConvId === conv.id ? (
                                                                    <Loader2 size={13} className="animate-spin text-rose-500" />
                                                                ) : (
                                                                    <Trash2 size={13} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {conv.last_message && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1 font-medium">
                                                            {conv.last_message}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5 border-t border-slate-100 dark:border-slate-700/40">
                                                        <span>{conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : 'Recent'}</span>
                                                        <span>{conv.message_count || 0} msgs</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {conversations.length > 0 && (
                                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700/80 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleClearAllHistory}
                                            className="w-full py-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Trash2 size={12} />
                                            <span>Clear All Chat History</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Regular Chat View */
                            <>
                                {/* ── QUICK-REPLY CHIPS ROW ── */}
                                {messages.length === 1 && (
                                    <div className="px-1.5 sm:px-2 py-1.5 bg-orange-50/90 dark:bg-slate-800/90 border-b border-orange-100 dark:border-slate-700 flex items-center gap-1 shrink-0 relative">
                                        <button
                                            type="button"
                                            onClick={() => scrollChips('left')}
                                            disabled={!canScrollLeft}
                                            aria-label="Scroll suggestions left"
                                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                canScrollLeft
                                                    ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs border border-orange-200 hover:bg-[#f05a00] hover:text-white cursor-pointer active:scale-95'
                                                    : 'text-slate-300 dark:text-slate-600 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                            }`}
                                        >
                                            <ChevronLeft size={13} strokeWidth={2.5} />
                                        </button>

                                        <div
                                            ref={chipsScrollRef}
                                            onScroll={updateScrollChevrons}
                                            className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth items-center py-0.5"
                                        >
                                            {activeChips.map((item) => (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    onClick={() => handleSendMessage(null, item.query)}
                                                    className="text-[11px] font-semibold whitespace-nowrap text-[#ea580c] dark:text-orange-300 bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-900/40 px-3 py-1 rounded-full hover:bg-[#f05a00] hover:text-white hover:border-[#f05a00] transition-colors shrink-0 cursor-pointer shadow-2xs active:scale-95 min-h-[30px]"
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => scrollChips('right')}
                                            disabled={!canScrollRight}
                                            aria-label="Scroll suggestions right"
                                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                canScrollRight
                                                    ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs border border-orange-200 hover:bg-[#f05a00] hover:text-white cursor-pointer active:scale-95'
                                                    : 'text-slate-300 dark:text-slate-600 border border-transparent opacity-20 cursor-not-allowed pointer-events-none'
                                            }`}
                                        >
                                            <ChevronRight size={13} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                )}

                                {/* ── MESSAGES CONTAINER ── */}
                                <div
                                    role="log"
                                    aria-live="polite"
                                    className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
                                >
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-6 h-6 rounded-full bg-[#f05a00] flex items-center justify-center mr-2 mt-0.5 shrink-0 shadow-xs">
                                                    <Brain size={12} className="text-white" />
                                                </div>
                                            )}
                                            <div
                                                className={`${
                                                    isMaximized ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-[85%]'
                                                } p-3 rounded-2xl text-[13px] font-medium leading-relaxed ${
                                                    msg.role === 'user'
                                                        ? 'bg-[#f05a00] text-white rounded-br-xs shadow-xs'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/50 dark:border-slate-700/50'
                                                }`}
                                            >
                                                {msg.role === 'assistant' ? (
                                                    <>
                                                        <PulseAIMarkdown content={msg.text} />
                                                        {msg.retryText && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSendMessage(null, msg.retryText)}
                                                                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 text-[#ea580c] dark:text-orange-400 text-xs font-bold transition-colors cursor-pointer"
                                                            >
                                                                <span>Retry</span>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Loading State with Brain Avatar */}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="w-6 h-6 rounded-full bg-[#f05a00] flex items-center justify-center mr-2 mt-0.5 shrink-0 shadow-xs">
                                                <Brain size={12} className="text-white" />
                                            </div>
                                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-xs flex gap-1.5 border border-slate-200/50 dark:border-slate-700/50 items-center">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* ── INPUT BAR ── */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                                >
                                    <div className="flex gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Ask PULSEAI..."
                                            aria-label="Ask PULSEAI"
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 focus:border-[#f05a00]/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#f05a00] outline-none placeholder:text-slate-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !query.trim()}
                                            aria-label="Send message to PULSEAI"
                                            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#f05a00] hover:bg-[#d94e00] flex items-center justify-center text-white transition-colors disabled:opacity-40 shrink-0 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f05a00]"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>,
            document.body
        )
        : null;
}
