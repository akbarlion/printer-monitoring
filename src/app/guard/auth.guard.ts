import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SessionDialogService } from '../services/session-dialog.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const sessionDialogService = inject(SessionDialogService);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return of(false);
  }

  // Check if token is expired
  if (authService.isTokenExpired()) {
    return sessionDialogService.showSessionExpiredDialog().pipe(
      switchMap(result => {
        if (result === 'extend') {
          // Try to refresh token
          return authService.refreshAccessToken().pipe(
            switchMap(() => of(true)),
            // If refresh fails, logout and redirect
            switchMap(() => {
              authService.logout().subscribe();
              router.navigate(['/login']);
              return of(false);
            })
          );
        } else {
          // User chose to login again
          authService.logout().subscribe();
          router.navigate(['/login']);
          return of(false);
        }
      })
    );
  }

  return of(true);
};
