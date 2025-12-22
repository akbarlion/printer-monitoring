import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User, LoginCredentials, AuthResponse } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  // private apiUrl = 'http://localhost:3000/api/auth';
  private apiUrl = 'http://localhost/api-printer/api';
  private accessToken: string;
  private refreshToken: string;

  constructor(private http: HttpClient) {
    this.accessToken = localStorage.getItem('accessToken') || '';
    this.refreshToken = localStorage.getItem('refreshToken') || '';

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }

    if (this.refreshToken && !this.accessToken) {
      this.refreshAccessToken().subscribe({
        next: () => {
          console.log('Auto refresh successful');
        },
        error: () => {
          console.log('Auto refresh failed, clearing tokens');
          this.clearTokens();
        }
      });
    }
  }

  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response: any) => {
          this.accessToken = response.accessToken;
          this.refreshToken = response.refreshToken;

          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('currentUser', JSON.stringify(response.user));

          this.currentUserSubject.next(response.user);
        })
      );
  }

  refreshAccessToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response: any) => {
          this.accessToken = response.accessToken;
          this.refreshToken = response.refreshToken;

          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        }),
        catchError((error) => {
          console.error('Refresh error:', error);
          this.logout();
          return throwError(() => error);
        })
      );
  }

  register(userData: { username: string, email: string, password: string, role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');

    const logoutRequest = refreshToken ?
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }) :
      new Observable(observer => observer.complete());

    return logoutRequest.pipe(
      tap(() => {
        this.clearTokens();
      })
    );
  }

  isAuthenticated(): boolean {
    return !!this.accessToken || !!localStorage.getItem('refreshToken');
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      return payload.exp < (currentTime + 300);
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  getAccessToken(): string {
    const token = localStorage.getItem('accessToken') || this.accessToken;
    return token;
  }

  private clearTokens(): void {
    this.accessToken = '';
    this.refreshToken = '';
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }
}
