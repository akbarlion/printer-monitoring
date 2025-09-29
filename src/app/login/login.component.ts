import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoginCredentials } from '../interfaces/user.interface';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isRegisterMode = false;
  isLoading = false;
  errorMessage = '';

  credentials: LoginCredentials = {
    username: '',
    password: ''
  };

  registerData: RegisterData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleMode(event: Event): void {
    event.preventDefault();
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.resetForms();
  }

  onLogin(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Username dan password harus diisi';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Login gagal';
        this.isLoading = false;
      }
    });
  }

  onRegister(): void {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.errorMessage = 'Password tidak cocok';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const registerPayload = {
      username: this.registerData.username,
      email: this.registerData.email,
      password: this.registerData.password
    };

    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.isLoading = false;
        this.credentials.username = this.registerData.username;
        this.credentials.password = this.registerData.password;
        this.registerData = { username: '', email: '', password: '', confirmPassword: '' };
        this.isRegisterMode = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Registrasi gagal';
        this.isLoading = false;
      }
    });
  }

  private resetForms(): void {
    this.credentials = { username: '', password: '' };
    this.registerData = { username: '', email: '', password: '', confirmPassword: '' };
  }
}
