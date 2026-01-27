import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Key for storing the redirect URL in sessionStorage
export const REDIRECT_URL_KEY = 'redirectAfterLogin';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Save the attempted URL for redirecting after login
  sessionStorage.setItem(REDIRECT_URL_KEY, state.url);

  void router.navigate(['/login']);
  return false;
};
