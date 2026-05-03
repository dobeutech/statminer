'use client';

let initialized = false;

export async function initDatadogRUM() {
  if (initialized || typeof window === 'undefined') return;

  const applicationId = process.env.NEXT_PUBLIC_DD_RUM_APPLICATION_ID;
  const clientToken = process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN;

  if (!applicationId || !clientToken) return;

  try {
    // @ts-ignore -- optional dependency, may not be installed
    const { datadogRum } = await import('@datadog/browser-rum');
    // @ts-ignore -- optional dependency, may not be installed
    const { datadogLogs } = await import('@datadog/browser-logs');

    datadogRum.init({
      applicationId,
      clientToken,
      site: process.env.NEXT_PUBLIC_DD_SITE || 'datadoghq.com',
      service: process.env.NEXT_PUBLIC_DD_SERVICE || 'statminer',
      env: process.env.NODE_ENV || 'production',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });

    datadogLogs.init({
      clientToken,
      site: process.env.NEXT_PUBLIC_DD_SITE || 'datadoghq.com',
      service: process.env.NEXT_PUBLIC_DD_SERVICE || 'statminer',
      env: process.env.NODE_ENV || 'production',
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
    });

    datadogRum.startSessionReplayRecording();
    initialized = true;
  } catch {
    // Datadog packages not installed or unavailable -- non-blocking
  }
}
