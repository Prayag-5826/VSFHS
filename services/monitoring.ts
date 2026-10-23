import React from 'react';

/**
 * Universal Mock for Sentry (Pure TypeScript - No JSX syntax required)
 * Safely handles any legacy Sentry imports across React, Vite, and Capacitor.
 */

export interface ErrorContext {
  [key: string]: any;
}

export interface UserContext {
  id?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export function init(options?: any): void {
  console.info('[Diagnostics] Monitoring active (Local diagnostics mode).');
}

export const initMonitoring = init;

export function captureException(error: unknown, context?: ErrorContext): string {
  const eventId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.error(`[Diagnostics Error ${eventId}]:`, error, context || '');

  try {
    const errorEntry = {
      id: eventId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString()
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = JSON.parse(localStorage.getItem('vsf_app_errors') || '[]');
      existing.unshift(errorEntry);
      localStorage.setItem('vsf_app_errors', JSON.stringify(existing.slice(0, 15)));
    }
  } catch {
    // Fail silently
  }

  return eventId;
}

export function captureMessage(message: string, level: string = 'info'): string {
  const msgId = `MSG-${Date.now()}`;
  console.warn(`[Diagnostics Log (${level})]:`, message);
  return msgId;
}

export function setUser(user: UserContext | null): void {}
export const setUserContext = setUser;
export function identifyUser(user: UserContext | null): void {}
export function clearUser(): void {}

export function setTag(key: string, value: any): void {}
export function setTags(tags: Record<string, any>): void {}
export function setExtra(key: string, extra: any): void {}
export function setExtras(extras: Record<string, any>): void {}
export function setContext(name: string, context: Record<string, any> | null): void {}
export function addBreadcrumb(breadcrumb: any): void {}

export function configureScope(callback: (scope: any) => void): void {
  try {
    callback({
      setUser,
      setUserContext,
      identifyUser,
      clearUser,
      setTag,
      setTags,
      setExtra,
      setExtras,
      setContext,
      addBreadcrumb
    });
  } catch {
    // Safe mock
  }
}

export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  _options?: any
): React.ComponentType<P> {
  return Component;
}

export function wrap<T>(fn: T): T {
  return fn;
}

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error; resetError: () => void }) => React.ReactNode);
  onError?: (error: Error, componentStack: string, eventId: string) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const eventId = captureException(error, { componentStack: errorInfo.componentStack });
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack || '', eventId);
    }
  }

  resetError = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, resetError: this.resetError });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return React.createElement(
        'div',
        { style: { padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' } },
        React.createElement(
          'h3',
          { style: { margin: '0 0 8px 0', color: '#B91C1C', textTransform: 'uppercase' } },
          'Application Error'
        ),
        React.createElement(
          'p',
          { style: { margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' } },
          this.state.error.message
        ),
        React.createElement(
          'button',
          {
            onClick: () => window.location.reload(),
            style: {
              padding: '8px 16px',
              backgroundColor: '#1E293B',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }
          },
          'Reload Page'
        )
      );
    }
    return this.props.children || null;
  }
}

export function browserTracingIntegration(_options?: any): any {
  return {};
}

export function reactRouterV6BrowserTracingIntegration(_options?: any): any {
  return {};
}

export const Sentry = {
  init,
  initMonitoring,
  identifyUser,
  clearUser,
  captureException,
  captureMessage,
  setUser,
  setUserContext,
  setTag,
  setTags,
  setExtra,
  setExtras,
  setContext,
  addBreadcrumb,
  configureScope,
  withProfiler,
  wrap,
  ErrorBoundary,
  browserTracingIntegration,
  reactRouterV6BrowserTracingIntegration
};

export default Sentry;
