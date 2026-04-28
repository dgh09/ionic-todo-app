import { CategoryService } from './category.service';
import { StorageService } from './storage.service';
import { BehaviorSubject } from 'rxjs';

const mockUser = { uid: 'user-123', email: 'test@test.com', displayName: 'Test' };

const mockAuthService = {
  user$: new BehaviorSubject<any>(mockUser),
  getUser: jest.fn().mockReturnValue(null),
};

describe('CategoryService', () => {
  let service: CategoryService;
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockAuthService.getUser.mockReturnValue(null);
    storage = new StorageService();
    service = new CategoryService(storage, mockAuthService as any);
  });

  describe('inicialización sin Firebase', () => {
    it('carga las categorías por defecto cuando localStorage está vacío', (done) => {
      service.categories$.subscribe(cats => {
        if (cats.length > 0) {
          expect(cats.length).toBe(3);
          expect(cats.map(c => c.id)).toEqual(
            expect.arrayContaining(['personal', 'work', 'shopping'])
          );
          done();
        }
      });
    });

    it('carga categorías guardadas en localStorage', (done) => {
      const saved = [{ id: 'custom', name: 'Custom', color: '#fff', icon: 'star', type: 'default' as const }];
      storage.set('todo_categories', saved);

      const svc = new CategoryService(storage, mockAuthService as any);
      svc.categories$.subscribe(cats => {
        if (cats.length === 1) {
          expect(cats[0].id).toBe('custom');
          done();
        }
      });
    });
  });

  describe('getAll', () => {
    it('retorna el array actual de categorías', () => {
      const cats = service.getAll();
      expect(Array.isArray(cats)).toBe(true);
      expect(cats.length).toBe(3);
    });
  });

  describe('getById', () => {
    it('retorna la categoría correcta por id', () => {
      const cat = service.getById('personal');
      expect(cat).toBeDefined();
      expect(cat?.name).toBe('Personal');
    });

    it('retorna undefined para un id inexistente', () => {
      expect(service.getById('no-existe')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('agrega una nueva categoría al stream', (done) => {
      service.add({ name: 'Salud', color: '#ff0000', icon: 'heart', type: 'default' });

      service.categories$.subscribe(cats => {
        const found = cats.find(c => c.name === 'Salud');
        if (found) {
          expect(found.color).toBe('#ff0000');
          expect(found.id).toBeDefined();
          done();
        }
      });
    });

    it('genera un id único por cada categoría', () => {
      const c1 = service.add({ name: 'A', color: '#000', icon: 'star', type: 'default' });
      const c2 = service.add({ name: 'B', color: '#000', icon: 'star', type: 'default' });
      expect(c1.id).not.toBe(c2.id);
    });

    it('persiste en localStorage', () => {
      service.add({ name: 'Guardada', color: '#abc', icon: 'home', type: 'default' });
      const saved = storage.get<any[]>('todo_categories');
      expect(saved?.find(c => c.name === 'Guardada')).toBeDefined();
    });
  });

  describe('update', () => {
    it('actualiza el nombre de una categoría', (done) => {
      const cat = service.add({ name: 'Original', color: '#000', icon: 'star', type: 'default' });
      service.update(cat.id, { name: 'Actualizada' });

      service.categories$.subscribe(cats => {
        const found = cats.find(c => c.id === cat.id);
        if (found?.name === 'Actualizada') {
          expect(found.name).toBe('Actualizada');
          done();
        }
      });
    });

    it('no modifica otras categorías', (done) => {
      const c1 = service.add({ name: 'C1', color: '#000', icon: 'star', type: 'default' });
      service.add({ name: 'C2', color: '#000', icon: 'star', type: 'default' });
      service.update(c1.id, { name: 'C1 editada' });

      service.categories$.subscribe(cats => {
        const c2 = cats.find(c => c.name === 'C2');
        if (c2) {
          expect(c2.name).toBe('C2');
          done();
        }
      });
    });
  });

  describe('delete', () => {
    it('elimina una categoría del stream', (done) => {
      const cat = service.add({ name: 'Borrar', color: '#000', icon: 'star', type: 'default' });
      service.delete(cat.id);

      service.categories$.subscribe(cats => {
        if (!cats.find(c => c.id === cat.id)) {
          expect(cats.find(c => c.id === cat.id)).toBeUndefined();
          done();
        }
      });
    });

    it('no elimina categorías que no coinciden con el id', (done) => {
      service.add({ name: 'Queda', color: '#000', icon: 'star', type: 'default' });
      const toDelete = service.add({ name: 'Borrar', color: '#000', icon: 'star', type: 'default' });
      service.delete(toDelete.id);

      service.categories$.subscribe(cats => {
        const keeped = cats.find(c => c.name === 'Queda');
        if (keeped) {
          expect(keeped).toBeDefined();
          done();
        }
      });
    });
  });
});
