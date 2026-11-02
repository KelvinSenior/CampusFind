import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('restores a session without requiring a CSRF token for a GET request', async () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    const restore = auth.restoreSession();
    const request = http.expectOne('/api/auth/me');

    expect(request.request.method).toBe('GET');
    request.flush(
      { error: 'Authentication is required.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await restore).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.sessionError()).toBeNull();
    http.expectNone('/api/auth/csrf');
  });
});
