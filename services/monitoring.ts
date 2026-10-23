/**
 * Crash and error reporting (Sentry). It stays off until VITE_SENTRY_DSN is set, so the app
 * runs the same in development. Install once:
 *     npm i @sentry/capacitor @sentry/react
 *     npx cap sync
 * Then call initMonitoring() in main.tsx BEFORE rendering the app.
 */
import * as Sentry from '@sentry/capacitor';
import * as SentryReact from '@sentry/react';

const DSN = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
const RELEASE = (import.meta as any).env?.VITE_APP_VERSION as string | undefined;

let enabled = false;

export const initMonitoring = () => {
  if (!DSN || enabled) return;
  enabled = true;

  Sentry.init(
    {
      dsn: DSN,
      release: RELEASE,
      environment: (import.meta as any).env?.MODE || 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      // Never send login tokens, cookies or personal details with an error report.
      beforeSend(event) {
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete (event.request.headers as Record<string, string>)['x-session-token'];
            delete (event.request.headers as Record<string, string>)['Cookie'];
          }
        }
        if (event.user) event.user = { id: event.user.id };
        return event;
      }
    },
    SentryReact.init
  );
};

/** Tag reports with the officer's id and role only (no name, phone or email). */
export const identifyUser = (user: { id: string; role?: string } | null) => {
  if (!enabled) return;
  Sentry.setUser(user ? { id: user.id } : null);
  Sentry.setTag('role', user?.role || 'none');
};

export const reportError = (error: unknown, context?: Record<string, unknown>) => {
  if (enabled) Sentry.captureException(error, { extra: context });
  else console.error('Unreported error (monitoring is off):', error, context);
};
