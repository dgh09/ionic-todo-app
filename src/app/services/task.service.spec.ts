import { TaskService } from './task.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

const mockUser = { uid: 'user-123', email: 'test@test.com', displayName: 'Test' };

const mockAuthService = {
  user$: new BehaviorSubject<any>(mockUser),
  getUser: jest.fn().mockReturnValue(mockUser),
};

describe('TaskService', () => {
  let service: TaskService;
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockAuthService.getUser.mockReturnValue(null); // sin Firebase
    storage = new StorageService();
    service = new TaskService(storage, mockAuthService as any);
  });

  describe('add', () => {
    it('agrega una tarea y la emite en el stream', (done) => {
      service.add({ title: 'Tarea 1', completed: false, priority: 'low', categoryId: null });

      service.tasks$.subscribe(tasks => {
        if (tasks.length > 0) {
          expect(tasks[0].title).toBe('Tarea 1');
          expect(tasks[0].completed).toBe(false);
          expect(tasks[0].id).toBeDefined();
          expect(tasks[0].createdAt).toBeDefined();
          done();
        }
      });
    });

    it('asigna un id único a cada tarea', () => {
      const t1 = service.add({ title: 'T1', completed: false, priority: 'low', categoryId: null });
      const t2 = service.add({ title: 'T2', completed: false, priority: 'low', categoryId: null });
      expect(t1.id).not.toBe(t2.id);
    });

    it('persiste en localStorage cuando no hay Firestore', () => {
      service.add({ title: 'Persistida', completed: false, priority: 'medium', categoryId: null });
      const saved = storage.get<any[]>('todo_tasks');
      expect(saved).not.toBeNull();
      expect(saved![0].title).toBe('Persistida');
    });
  });

  describe('toggle', () => {
    it('cambia completed de false a true', (done) => {
      const task = service.add({ title: 'Toggle', completed: false, priority: 'low', categoryId: null });
      service.toggle(task.id);

      service.tasks$.subscribe(tasks => {
        const found = tasks.find(t => t.id === task.id);
        if (found?.completed) {
          expect(found.completed).toBe(true);
          done();
        }
      });
    });

    it('cambia completed de true a false', (done) => {
      const task = service.add({ title: 'Completada', completed: true, priority: 'low', categoryId: null });
      service.toggle(task.id);

      service.tasks$.subscribe(tasks => {
        const found = tasks.find(t => t.id === task.id);
        if (found && !found.completed) {
          expect(found.completed).toBe(false);
          done();
        }
      });
    });
  });

  describe('update', () => {
    it('actualiza el título de una tarea', (done) => {
      const task = service.add({ title: 'Original', completed: false, priority: 'low', categoryId: null });
      service.update(task.id, { title: 'Actualizada' });

      service.tasks$.subscribe(tasks => {
        const found = tasks.find(t => t.id === task.id);
        if (found?.title === 'Actualizada') {
          expect(found.title).toBe('Actualizada');
          done();
        }
      });
    });
  });

  describe('delete', () => {
    it('elimina la tarea del stream', (done) => {
      const task = service.add({ title: 'Eliminar', completed: false, priority: 'low', categoryId: null });
      service.delete(task.id);

      service.tasks$.subscribe(tasks => {
        if (!tasks.find(t => t.id === task.id)) {
          expect(tasks.find(t => t.id === task.id)).toBeUndefined();
          done();
        }
      });
    });
  });

  describe('getStats', () => {
    it('retorna totales correctos', () => {
      service.add({ title: 'T1', completed: false, priority: 'low', categoryId: null });
      service.add({ title: 'T2', completed: true, priority: 'low', categoryId: null });
      service.add({ title: 'T3', completed: false, priority: 'low', categoryId: null });

      const stats = service.getStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.active).toBe(2);
    });

    it('retorna ceros cuando no hay tareas', () => {
      const stats = service.getStats();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.active).toBe(0);
    });
  });

  describe('filteredTasks$', () => {
    it('filtra por categoría', (done) => {
      service.add({ title: 'Cat A', completed: false, priority: 'low', categoryId: 'cat-a' });
      service.add({ title: 'Cat B', completed: false, priority: 'low', categoryId: 'cat-b' });
      service.setFilterCategory('cat-a');

      service.filteredTasks$.subscribe(tasks => {
        if (tasks.length === 1) {
          expect(tasks[0].title).toBe('Cat A');
          done();
        }
      });
    });

    it('filtra por estado completado', (done) => {
      service.add({ title: 'Activa', completed: false, priority: 'low', categoryId: null });
      service.add({ title: 'Hecha', completed: true, priority: 'low', categoryId: null });
      service.setFilterStatus('completed');

      service.filteredTasks$.subscribe(tasks => {
        if (tasks.length === 1) {
          expect(tasks[0].title).toBe('Hecha');
          done();
        }
      });
    });

    it('ordena completadas al final', (done) => {
      service.add({ title: 'Hecha', completed: true, priority: 'low', categoryId: null });
      service.add({ title: 'Activa', completed: false, priority: 'low', categoryId: null });

      service.filteredTasks$.subscribe(tasks => {
        if (tasks.length === 2) {
          expect(tasks[0].title).toBe('Activa');
          expect(tasks[1].title).toBe('Hecha');
          done();
        }
      });
    });
  });
});
