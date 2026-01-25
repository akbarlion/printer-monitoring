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
  // private apiUrl = 'http://localhost/api-printer/api';
  private apiUrl = 'http://localhost/printer-api/api';
  private accessToken: string;

  constructor(private http: HttpClient) {
    this.accessToken = localStorage.getItem('token') || '';

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && this.accessToken) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response: any) => {
          this.accessToken = response.data.token;
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
          this.currentUserSubject.next(response.data.user);
        })
      );
  }



  register(userData: { username: string, email: string, password: string, role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {})
      .pipe(
        tap(() => {
          this.clearTokens();
        })
      );
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
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
    return this.accessToken;
  }

  private clearTokens(): void {
    this.accessToken = '';
    localStorage.removeItem('token');
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
