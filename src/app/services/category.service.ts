import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Category } from '../models/category.model';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

const LS_KEY = 'todo_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'personal', name: 'Personal', color: '#3880ff', icon: 'person' },
  { id: 'work', name: 'Trabajo', color: '#eb445a', icon: 'briefcase' },
  { id: 'shopping', name: 'Compras', color: '#2dd36f', icon: 'cart' },
];

@Injectable({ providedIn: 'root' })
export class CategoryService implements OnDestroy {
  private db: any = null;
  private unsubscribeSnapshot?: () => void;
  private authSub?: Subscription;

  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable();

  constructor(private storage: StorageService, private authService: AuthService) {
    this.authSub = this.authService.user$.subscribe(user => {
      this.unsubscribeSnapshot?.();
      if (user) {
        this.listenToUserCategories(user.uid);
      } else {
        this.categoriesSubject.next([]);
      }
    });
  }

  async initialize(app: any): Promise<void> {
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore(app);
    const user = this.authService.getUser();
    if (user) this.listenToUserCategories(user.uid);
  }

  private async listenToUserCategories(uid: string): Promise<void> {
    if (!this.db) {
      const saved = this.storage.get<Category[]>(LS_KEY);
      this.categoriesSubject.next(saved ?? DEFAULT_CATEGORIES);
      return;
    }

    const { collection, onSnapshot, doc, setDoc } = await import('firebase/firestore');
    const ref = collection(this.db, `users/${uid}/categories`);

    this.unsubscribeSnapshot?.();
    this.unsubscribeSnapshot = onSnapshot(ref, async snapshot => {
      if (snapshot.empty) {
        // Primer acceso: sembrar categorías por defecto
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(this.db, `users/${uid}/categories/${cat.id}`), cat);
        }
        return;
      }
      const categories = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      this.categoriesSubject.next(categories);
    });
  }

  getAll(): Category[] {
    return this.categoriesSubject.value;
  }

  getById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  add(category: Omit<Category, 'id'>): Category {
    const newCat: Category = { ...category, id: crypto.randomUUID() };
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, setDoc }) =>
        setDoc(doc(this.db, `users/${user.uid}/categories/${newCat.id}`), newCat)
      );
    } else {
      this.categoriesSubject.next([...this.categoriesSubject.value, newCat]);
      this.storage.set(LS_KEY, this.categoriesSubject.value);
    }

    return newCat;
  }

  update(id: string, changes: Partial<Omit<Category, 'id'>>): void {
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, updateDoc }) =>
        updateDoc(doc(this.db, `users/${user.uid}/categories/${id}`), changes as any)
      );
    } else {
      const updated = this.categoriesSubject.value.map(c => (c.id === id ? { ...c, ...changes } : c));
      this.categoriesSubject.next(updated);
      this.storage.set(LS_KEY, updated);
    }
  }

  delete(id: string): void {
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, deleteDoc }) =>
        deleteDoc(doc(this.db, `users/${user.uid}/categories/${id}`))
      );
    } else {
      const filtered = this.categoriesSubject.value.filter(c => c.id !== id);
      this.categoriesSubject.next(filtered);
      this.storage.set(LS_KEY, filtered);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeSnapshot?.();
    this.authSub?.unsubscribe();
  }
}
