import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Category } from '../models/category.model';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'todo_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'personal', name: 'Personal', color: '#3880ff', icon: 'person' },
  { id: 'work', name: 'Trabajo', color: '#eb445a', icon: 'briefcase' },
  { id: 'shopping', name: 'Compras', color: '#2dd36f', icon: 'cart' },
];

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable();

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const saved = this.storage.get<Category[]>(STORAGE_KEY);
    this.categoriesSubject.next(saved ?? DEFAULT_CATEGORIES);
  }

  private persist(): void {
    this.storage.set(STORAGE_KEY, this.categoriesSubject.value);
  }

  getAll(): Category[] {
    return this.categoriesSubject.value;
  }

  getById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  add(category: Omit<Category, 'id'>): Category {
    const newCat: Category = { ...category, id: crypto.randomUUID() };
    this.categoriesSubject.next([...this.categoriesSubject.value, newCat]);
    this.persist();
    return newCat;
  }

  update(id: string, changes: Partial<Omit<Category, 'id'>>): void {
    const updated = this.categoriesSubject.value.map(c =>
      c.id === id ? { ...c, ...changes } : c
    );
    this.categoriesSubject.next(updated);
    this.persist();
  }

  delete(id: string): void {
    this.categoriesSubject.next(this.categoriesSubject.value.filter(c => c.id !== id));
    this.persist();
  }
}
