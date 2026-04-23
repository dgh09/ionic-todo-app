import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebaseAuth: any = null;
  private currentUser = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.currentUser.asObservable();

  async initialize(firebaseApp: any): Promise<void> {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      this.firebaseAuth = getAuth(firebaseApp);
      onAuthStateChanged(this.firebaseAuth, user => {
        this.currentUser.next(
          user
            ? { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? user.email ?? '' }
            : null
        );
      });
    } catch {
      // Firebase not available — demo mode stays active
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    if (this.firebaseAuth) {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
      const user = result.user;
      this.currentUser.next({
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? user.email ?? '',
      });
    } else {
      const uid = btoa(email).replace(/=/g, '');
      this.currentUser.next({ uid, email, displayName: email.split('@')[0] });
    }
  }

  async register(email: string, password: string, displayName?: string): Promise<void> {
    if (this.firebaseAuth) {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
      const user = result.user;
      if (displayName) await updateProfile(user, { displayName });
      this.currentUser.next({
        uid: user.uid,
        email: user.email ?? '',
        displayName: displayName ?? user.email ?? '',
      });
    } else {
      const uid = btoa(email).replace(/=/g, '');
      this.currentUser.next({ uid, email, displayName: displayName ?? email.split('@')[0] });
    }
  }

  async signOut(): Promise<void> {
    if (this.firebaseAuth) {
      const { signOut } = await import('firebase/auth');
      await signOut(this.firebaseAuth);
    }
    this.currentUser.next(null);
  }

  getUser(): AuthUser | null {
    return this.currentUser.value;
  }

  isAuthenticated(): boolean {
    return this.currentUser.value !== null;
  }
}
