import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Task } from '../models/task.model';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'todo_tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private filterCategorySubject = new BehaviorSubject<string | null>(null);
  private filterStatusSubject = new BehaviorSubject<'all' | 'active' | 'completed'>('all');

  tasks$ = this.tasksSubject.asObservable();
  filterCategory$ = this.filterCategorySubject.asObservable();
  filterStatus$ = this.filterStatusSubject.asObservable();

  filteredTasks$: Observable<Task[]> = combineLatest([
    this.tasks$,
    this.filterCategory$,
    this.filterStatus$,
  ]).pipe(
    map(([tasks, category, status]) => {
      let result = tasks;
      if (category !== null) {
        result = result.filter(t => t.categoryId === category);
      }
      if (status === 'active') {
        result = result.filter(t => !t.completed);
      } else if (status === 'completed') {
        result = result.filter(t => t.completed);
      }
      return result.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    })
  );

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const saved = this.storage.get<Task[]>(STORAGE_KEY);
    this.tasksSubject.next(saved ?? []);
  }

  private persist(): void {
    this.storage.set(STORAGE_KEY, this.tasksSubject.value);
  }

  add(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.tasksSubject.next([...this.tasksSubject.value, newTask]);
    this.persist();
    return newTask;
  }

  update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    const updated = this.tasksSubject.value.map(t =>
      t.id === id ? { ...t, ...changes } : t
    );
    this.tasksSubject.next(updated);
    this.persist();
  }

  toggle(id: string): void {
    const task = this.tasksSubject.value.find(t => t.id === id);
    if (task) {
      this.update(id, { completed: !task.completed });
    }
  }

  delete(id: string): void {
    this.tasksSubject.next(this.tasksSubject.value.filter(t => t.id !== id));
    this.persist();
  }

  deleteByCategory(categoryId: string): void {
    this.tasksSubject.next(
      this.tasksSubject.value.filter(t => t.categoryId !== categoryId)
    );
    this.persist();
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
}
