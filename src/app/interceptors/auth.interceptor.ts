import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for login/register requests
    if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
      return next.handle(req);
    }

    // Get token from localStorage (refresh token) or memory
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      // For now, just add refresh token as Bearer (temporary fix)
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${refreshToken}`
        }
      });
      
      return next.handle(authReq).pipe(
        catchError(error => {
          if (error.status === 401) {
            // Clear tokens and redirect to login
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            // You might want to redirect to login here
          }
          return throwError(() => error);
        })
      );
    }

    return next.handle(req);
  }
}