import { HttpErrorResponse } from '@angular/common/http';
import { getHttpErrorMessage } from './http-error';

describe('getHttpErrorMessage', () => {
  it('uses a string error message from the API response', () => {
    const error = new HttpErrorResponse({ status: 401, error: { error: 'Invalid credentials.' } });
    expect(getHttpErrorMessage(error, 'Fallback')).toBe('Invalid credentials.');
  });

  it('does not stringify object-shaped server errors', () => {
    const error = new HttpErrorResponse({ status: 500, error: { error: { code: 'FUNCTION_INVOCATION_FAILED' } } });
    expect(getHttpErrorMessage(error, 'Sign in failed.')).toBe(
      'Sign in failed. (HTTP 500). Check the backend runtime logs in Vercel.',
    );
  });

  it('explains a connection failure without exposing response objects', () => {
    const error = new HttpErrorResponse({ status: 0, error: { message: 'Network error' } });
    expect(getHttpErrorMessage(error, 'Fallback')).toBe(
      'Unable to reach the CampusFind API. Check the deployment and backend runtime logs.',
    );
  });
});
