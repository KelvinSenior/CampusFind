import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  if (error.status === 0) {
    return 'Unable to reach the CampusFind API. Check the deployment and backend runtime logs.';
  }

  const body: unknown = error.error;
  if (typeof body === 'object' && body !== null) {
    const payload = body as Record<string, unknown>;
    if (typeof payload['error'] === 'string') return payload['error'];
    if (typeof payload['message'] === 'string') return payload['message'];
  }

  if (error.status >= 500) {
    return `${fallback} (HTTP ${error.status}). Check the backend runtime logs in Vercel.`;
  }
  return `${fallback} (HTTP ${error.status}).`;
}
