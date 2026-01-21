import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,

  debug: false,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  beforeSend(event, hint) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Sentry] Event captured:", event.exception?.values?.[0]?.type);
    }
    return event;
  },

  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Loading chunk \d+ failed/,
    "Network request failed",
    "Failed to fetch",
    "Load failed",
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],
});
