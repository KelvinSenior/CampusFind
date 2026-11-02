import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { User } from './models';
import { getHttpErrorMessage } from './http-error';

const API_URL = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  readonly sessionError = signal<string | null>(null);
  private csrfToken: string | null = null;

  async login(email: string, password: string): Promise<void> {
    await this.ensureCsrfToken();
    const result = await firstValueFrom(
      this.http.post<{ user: User; csrfToken: string }>(`${API_URL}/auth/login`, { email, password }),
    );
    this.csrfToken = result.csrfToken;
    this.user.set(result.user);
    this.sessionError.set(null);
  }

  async register(firstName: string, lastName: string, email: string, password: string): Promise<void> {
    await this.ensureCsrfToken();
    const result = await firstValueFrom(
      this.http.post<{ user: User; csrfToken: string }>(`${API_URL}/auth/register`, {
        firstName,
        lastName,
        email,
        password,
        acceptedTerms: true,
      }),
    );
    this.csrfToken = result.csrfToken;
    this.user.set(result.user);
    this.sessionError.set(null);
  }

  async restoreSession(): Promise<boolean> {
    try {
      const result = await firstValueFrom(this.http.get<{ user: User }>(`${API_URL}/auth/me`));
      this.user.set(result.user);
      this.sessionError.set(null);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.user.set(null);
        this.sessionError.set(null);
        return false;
      }
      this.sessionError.set(getHttpErrorMessage(
        error,
        'We could not verify your session. Check the API configuration and try again.',
      ));
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.ensureCsrfToken();
    await firstValueFrom(this.http.post<void>(`${API_URL}/auth/logout`, {}));
    this.user.set(null);
    this.sessionError.set(null);
    this.csrfToken = null;
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  private async ensureCsrfToken(): Promise<void> {
    if (this.csrfToken) return;
    const result = await firstValueFrom(this.http.get<{ csrfToken: string }>(`${API_URL}/auth/csrf`));
    this.csrfToken = result.csrfToken;
  }
}
