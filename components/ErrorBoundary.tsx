import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 1. Log directly to browser console
    console.error('[Application ErrorBoundary Caught]:', error, errorInfo);

    this.setState({ errorInfo });

    // 2. Safe local error logging (Replaces Sentry without external paid services)
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        time: new Date().toISOString()
      };

      // Keep last 10 errors locally for diagnostics
      const existingLogs = JSON.parse(localStorage.getItem('vsf_app_errors') || '[]');
      existingLogs.unshift(errorLog);
      localStorage.setItem('vsf_app_errors', JSON.stringify(existingLogs.slice(0, 10)));
    } catch {
      // Ignore storage errors
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#FBFBF9] font-sans antialiased text-slate-900">
          <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 shadow-2xs">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your saved offline visits and records are safe on this device.
              </p>
            </div>

            {/* Error Message Preview */}
            {this.state.error && (
              <div className="text-left bg-red-50/70 border border-red-200/80 rounded-2xl p-3.5 space-y-2">
                <p className="text-[11px] font-mono font-bold text-red-900 break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>

                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="text-[10px] font-mono font-bold text-red-700 hover:text-red-900 flex items-center gap-1 cursor-pointer"
                >
                  {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>{this.state.showDetails ? 'Hide Stack Trace' : 'View Error Details'}</span>
                </button>

                {this.state.showDetails && (
                  <pre className="text-[9.5px] font-mono text-red-950/80 bg-white/80 p-2.5 rounded-xl overflow-x-auto max-h-40 border border-red-100 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/';
                  window.location.reload();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Return to Dashboard
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
