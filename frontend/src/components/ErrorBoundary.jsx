import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Critical Fault:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white font-sans">
                    <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-[2.5rem] p-12 text-center shadow-2xl">
                        <h1 className="text-3xl font-black mb-4 tracking-tighter">System Fault</h1>
                        <p className="text-slate-400 text-sm mb-6">A critical component failed to initialize correctly.</p>
                        
                        <div className="bg-red-500/10 border border-red-400/20 rounded-2xl p-4 mb-8 text-left overflow-hidden">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400/50 mb-2">Technical Logs</p>
                            <code className="text-[11px] font-mono text-red-400 whitespace-pre-wrap break-all leading-tight">
                                {this.state.error?.toString() || 'Unknown Runtime Exception'}
                            </code>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-orange-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                                Restart Session
                            </button>
                            <button
                                onClick={() => { window.location.href = '/resident-home'; }}
                                className="w-full py-3 bg-slate-700/60 hover:bg-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-300 transition-all cursor-pointer"
                            >
                                Return to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
