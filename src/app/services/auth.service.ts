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
  private apiUrl = 'http://localhost:3000/api/auth';
  private accessToken: string;
  private refreshToken: string;

  constructor(private http: HttpClient) {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken') || '';
    this.refreshToken = localStorage.getItem('refreshToken') || '';

    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }

    // Auto refresh if we have refresh token but no access token
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
    return this.http.post(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response: any) => {
          console.log('Login response:', response);
          this.accessToken = response.accessToken;
          this.refreshToken = response.refreshToken;

          // Store tokens in localStorage
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('currentUser', JSON.stringify(response.user));

          this.currentUserSubject.next(response.user);
          console.log('Tokens stored in localStorage');
        })
      );
  }

  refreshAccessToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Refreshing with token:', refreshToken);

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap((response: any) => {
          console.log('Refresh response:', response);
          this.accessToken = response.accessToken;
          this.refreshToken = response.refreshToken;

          // Update tokens in localStorage
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);

          console.log('New tokens stored in localStorage');
        }),
        catchError((error) => {
          console.error('Refresh error:', error);
          this.logout();
          return throwError(() => error);
        })
      );
  }

  register(userData: { username: string, email: string, password: string, role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');

    const logoutRequest = refreshToken ?
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }) :
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

  getAccessToken(): string {
    // Always get from localStorage to ensure persistence
    const token = localStorage.getItem('accessToken') || this.accessToken;
    console.log('Getting access token:', token);
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
