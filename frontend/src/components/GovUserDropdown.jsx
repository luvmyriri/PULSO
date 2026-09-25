import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    LogOut,
    Settings,
    Activity,
    FileText,
    ChevronDown,
    Shield,
    CheckCircle2
} from 'lucide-react';
import { getAuthUser, clearAuthSession } from '../utils/authSession';

const getInitials = (name) => {
    if (!name) return 'AR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export default function GovUserDropdown({ currentUser }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const user = currentUser || getAuthUser() || {
        name: 'Ana Reyes',
        roleLabel: 'Dispatcher',
        role: 'dispatcher',
        email: 'ana.reyes@caloocan.gov.ph'
    };

    const userName = user.full_name || user.name || 'Ana Reyes';
    const userRole = user.roleLabel || user.role_label || user.role || 'Dispatcher';
    const userEmail = user.email || `${userName.toLowerCase().replace(/\s+/g, '.')}@caloocan.gov.ph`;
    const initials = getInitials(userName);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSignOut = () => {
        clearAuthSession();
        window.location.href = '/gov';
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* User Badge Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 transition-all duration-150 cursor-pointer group text-left ${
                    isOpen ? 'opacity-100' : 'hover:opacity-90'
                }`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 text-white flex items-center justify-center font-heading font-bold text-xs shadow-inner group-hover:ring-2 group-hover:ring-[#ff6b00]/40 transition-all shrink-0">
                    {initials}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-none">
                    <span className="font-heading font-bold text-xs text-slate-800 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                        {userName}
                    </span>
                    <span className="text-[10px] font-mono-data text-slate-400 mt-0.5 capitalize">
                        {userRole}
                    </span>
                </div>
                <ChevronDown
                    size={13}
                    className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-[#ff6b00]' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu Popover */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800/90 shadow-2xl p-2 z-[100] select-none animate-in fade-in zoom-in-95 duration-150">
                    {/* User Profile Card */}
                    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#090e1a] border border-slate-100 dark:border-slate-800 mb-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-heading font-bold text-xs shadow-xs shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {userName}
                                </p>
                                <p className="text-[11px] font-mono-data text-slate-400 truncate mt-0.5">
                                    {userEmail}
                                </p>
                            </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] border border-orange-200/80 dark:border-orange-900/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {userRole}
                            </span>
                            <span className="text-[10px] font-mono-data text-slate-400">Online</span>
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="space-y-0.5">
                        <Link
                            to="/gov/today"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-heading font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Activity size={14} className="text-[#ff6b00]" />
                            <span>Today's Operations</span>
                        </Link>

                        <Link
                            to="/gov/reports"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-heading font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <FileText size={14} className="text-sky-500" />
                            <span>Citizen Reports</span>
                        </Link>

                        <Link
                            to="/gov/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-heading font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Settings size={14} className="text-slate-400" />
                            <span>Settings & Preferences</span>
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

                    {/* Sign Out Button */}
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-heading font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left group"
                    >
                        <LogOut size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
}