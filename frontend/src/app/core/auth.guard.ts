import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user() || (await auth.restoreSession()) ? true : router.createUrlTree(['/login']);
};

export const studentGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authenticated = auth.user() || (await auth.restoreSession());
  if (!authenticated) return router.createUrlTree(['/login']);
  return auth.user()?.role === 'STUDENT' ? true : router.createUrlTree(['/admin']);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const authenticated = auth.user() || (await auth.restoreSession());
  if (!authenticated) return router.createUrlTree(['/login']);
  return auth.user()?.role === 'ADMIN' ? true : router.createUrlTree(['/dashboard']);
};
