import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return of(false);
  }

  if (authService.isTokenExpired()) {
    authService.logout().subscribe();
    router.navigate(['/login']);
    return of(false);
  }

  return of(true);
};
