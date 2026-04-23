import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, combineLatest, map } from 'rxjs';
import { Task } from '../models/task.model';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

const LS_KEY = 'todo_tasks';

@Injectable({ providedIn: 'root' })
export class TaskService implements OnDestroy {
  private db: any = null;
  private unsubscribeSnapshot?: () => void;
  private authSub?: Subscription;

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private filterCategorySubject = new BehaviorSubject<string | null>(null);
  private filterStatusSubject = new BehaviorSubject<'all' | 'active' | 'completed'>('all');

  tasks$ = this.tasksSubject.asObservable();

  filteredTasks$: Observable<Task[]> = combineLatest([
    this.tasks$,
    this.filterCategorySubject,
    this.filterStatusSubject,
  ]).pipe(
    map(([tasks, category, status]) => {
      let result = tasks;
      if (category !== null) result = result.filter(t => t.categoryId === category);
      if (status === 'active') result = result.filter(t => !t.completed);
      else if (status === 'completed') result = result.filter(t => t.completed);
      return result.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return order[a.priority] - order[b.priority];
      });
    })
  );

  constructor(private storage: StorageService, private authService: AuthService) {
    this.authSub = this.authService.user$.subscribe(user => {
      this.unsubscribeSnapshot?.();
      if (user) {
        this.listenToUserTasks(user.uid);
      } else {
        this.tasksSubject.next([]);
      }
    });
  }

  async initialize(app: any): Promise<void> {
    const { getFirestore } = await import('firebase/firestore');
    this.db = getFirestore(app);
    const user = this.authService.getUser();
    if (user) this.listenToUserTasks(user.uid);
  }

  private async listenToUserTasks(uid: string): Promise<void> {
    if (!this.db) {
      const saved = this.storage.get<Task[]>(LS_KEY);
      this.tasksSubject.next(saved ?? []);
      return;
    }

    const { collection, onSnapshot } = await import('firebase/firestore');
    const ref = collection(this.db, `users/${uid}/tasks`);

    this.unsubscribeSnapshot?.();
    this.unsubscribeSnapshot = onSnapshot(ref, snapshot => {
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      this.tasksSubject.next(tasks);
    });
  }

  add(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const newTask: Task = { ...task, id: crypto.randomUUID(), createdAt: Date.now() };
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, setDoc }) =>
        setDoc(doc(this.db, `users/${user.uid}/tasks/${newTask.id}`), newTask)
      );
    } else {
      this.tasksSubject.next([...this.tasksSubject.value, newTask]);
      this.storage.set(LS_KEY, this.tasksSubject.value);
    }

    return newTask;
  }

  update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, updateDoc }) =>
        updateDoc(doc(this.db, `users/${user.uid}/tasks/${id}`), changes as any)
      );
    } else {
      const updated = this.tasksSubject.value.map(t => (t.id === id ? { ...t, ...changes } : t));
      this.tasksSubject.next(updated);
      this.storage.set(LS_KEY, updated);
    }
  }

  toggle(id: string): void {
    const task = this.tasksSubject.value.find(t => t.id === id);
    if (task) this.update(id, { completed: !task.completed });
  }

  delete(id: string): void {
    const user = this.authService.getUser();

    if (this.db && user) {
      import('firebase/firestore').then(({ doc, deleteDoc }) =>
        deleteDoc(doc(this.db, `users/${user.uid}/tasks/${id}`))
      );
    } else {
      const filtered = this.tasksSubject.value.filter(t => t.id !== id);
      this.tasksSubject.next(filtered);
      this.storage.set(LS_KEY, filtered);
    }
  }

  deleteByCategory(categoryId: string): void {
    this.tasksSubject.value
      .filter(t => t.categoryId === categoryId)
      .forEach(t => this.delete(t.id));
  }

  setFilterCategory(categoryId: string | null): void {
    this.filterCategorySubject.next(categoryId);
  }

  setFilterStatus(status: 'all' | 'active' | 'completed'): void {
    this.filterStatusSubject.next(status);
  }

  getStats(): { total: number; completed: number; active: number } {
    const tasks = this.tasksSubject.value;
    const completed = tasks.filter(t => t.completed).length;
    return { total: tasks.length, completed, active: tasks.length - completed };
  }

  ngOnDestroy(): void {
    this.unsubscribeSnapshot?.();
    this.authSub?.unsubscribe();
  }
}
