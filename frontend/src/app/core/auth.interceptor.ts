import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const headers: Record<string, string> = {};
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const csrfToken = auth.getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }
  return next(request.clone({ withCredentials: true, setHeaders: headers }));
};
