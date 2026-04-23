import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack, mailOutline, lockClosedOutline, personOutline,
  eyeOutline, eyeOffOutline, alertCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

type Mode = 'login' | 'register';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
})
export class LoginPage {
  mode: Mode = 'login';
  name = '';
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';

  constructor(private authService: AuthService, private router: Router) {
    addIcons({ arrowBack, mailOutline, lockClosedOutline, personOutline, eyeOutline, eyeOffOutline, alertCircleOutline });
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.errorMsg = '';
  }

  async submit(): Promise<void> {
    this.errorMsg = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMsg = 'Completa todos los campos.';
      return;
    }
    if (!this.isValidEmail(this.email)) {
      this.errorMsg = 'Ingresa un correo válido.';
      return;
    }
    if (this.mode === 'register' && !this.name.trim()) {
      this.errorMsg = 'Ingresa tu nombre.';
      return;
    }
    if (this.mode === 'register' && this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.loading = true;
    try {
      if (this.mode === 'login') {
        await this.authService.signIn(this.email.trim(), this.password);
      } else {
        await this.authService.register(this.email.trim(), this.password, this.name.trim() || undefined);
      }
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (err: any) {
      this.errorMsg = this.mapFirebaseError(err?.code);
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private mapFirebaseError(code: string | undefined): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/network-request-failed': 'Sin conexión. Revisa tu red.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    };
    return map[code ?? ''] ?? 'Ocurrió un error. Intenta de nuevo.';
  }
}
