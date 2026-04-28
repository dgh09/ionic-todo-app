// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonHeader: class IonHeader {},
  IonToolbar: class IonToolbar {},
  IonContent: class IonContent {},
  IonIcon: class IonIcon {},
  ModalController: jest.fn(),
  AlertController: jest.fn(),
  ToastController: jest.fn(),
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({}));
jest.mock('../../modals/add-category/add-category.modal', () => ({
  AddCategoryModal: class AddCategoryModal {},
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { BehaviorSubject } from 'rxjs';
import { CategoriesPage } from './categories.page';
import { Category } from '../../models/category.model';
import { Task } from '../../models/task.model';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
const personalCat: Category = { id: 'personal', name: 'Personal', color: '#00f', icon: 'person', type: 'default' };
const shoppingCat: Category = { id: 'shopping', name: 'Shopping', color: '#f00', icon: 'cart', type: 'shopping' };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Tarea',
    completed: false,
    priority: 'low',
    categoryId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Task;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildPage(
  categories: Category[] = [personalCat],
  tasks: Task[] = [],
) {
  const categories$ = new BehaviorSubject<Category[]>(categories);
  const tasks$      = new BehaviorSubject<Task[]>(tasks);

  const mockCategoryService = {
    categories$,
    add:    jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockTaskService = {
    tasks$,
    deleteByCategory: jest.fn(),
  };
  const mockModalCtrl = { create: jest.fn() };
  const mockAlertCtrl = { create: jest.fn() };
  const mockToastCtrl = { create: jest.fn() };
  const mockRouter    = { navigate: jest.fn() };
  const mockCdr       = { markForCheck: jest.fn() };

  const page = new CategoriesPage(
    mockCategoryService as any,
    mockTaskService     as any,
    mockModalCtrl       as any,
    mockAlertCtrl       as any,
    mockToastCtrl       as any,
    mockRouter          as any,
    mockCdr             as any,
  );

  return { page, mockCategoryService, mockTaskService, mockRouter, mockAlertCtrl };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('CategoriesPage', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('categories empieza vacío antes de ngOnInit', () => {
      const { page } = buildPage();
      expect(page.categories).toEqual([]);
    });

    it('taskCountMap empieza vacío antes de ngOnInit', () => {
      const { page } = buildPage();
      expect(page.taskCountMap).toEqual({});
    });
  });

  // ── goBack ──────────────────────────────────────────────────────────────────
  describe('goBack', () => {
    it('navega a /home', () => {
      const { page, mockRouter } = buildPage();
      page.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  // ── isShoppingCategory ──────────────────────────────────────────────────────
  describe('isShoppingCategory', () => {
    it('retorna true para categoría de tipo shopping', () => {
      const { page } = buildPage();
      expect(page.isShoppingCategory(shoppingCat)).toBe(true);
    });

    it('retorna true si el id es shopping aunque el type no coincida', () => {
      const { page } = buildPage();
      const edge: Category = { ...personalCat, id: 'shopping' };
      expect(page.isShoppingCategory(edge)).toBe(true);
    });

    it('retorna false para categoría de tipo default', () => {
      const { page } = buildPage();
      expect(page.isShoppingCategory(personalCat)).toBe(false);
    });
  });

  // ── ngOnInit — streams ──────────────────────────────────────────────────────
  describe('ngOnInit — streams', () => {
    it('carga las categorías del stream', () => {
      const { page } = buildPage([personalCat, shoppingCat]);
      page.ngOnInit();
      expect(page.categories.length).toBe(2);
    });

    it('construye taskCountMap con el conteo por categoría', () => {
      const tasks = [
        makeTask({ categoryId: 'personal' }),
        makeTask({ categoryId: 'personal' }),
        makeTask({ categoryId: 'shopping' }),
      ];
      const { page } = buildPage([personalCat, shoppingCat], tasks);
      page.ngOnInit();
      expect(page.taskCountMap['personal']).toBe(2);
      expect(page.taskCountMap['shopping']).toBe(1);
    });

    it('ignora tareas sin categoría en el conteo', () => {
      const tasks = [makeTask({ categoryId: null })];
      const { page } = buildPage([personalCat], tasks);
      page.ngOnInit();
      expect(Object.keys(page.taskCountMap).length).toBe(0);
    });
  });

  // ── confirmDelete ───────────────────────────────────────────────────────────
  describe('confirmDelete', () => {
    it('muestra mensaje diferente si hay tareas asignadas', async () => {
      const tasks = [makeTask({ categoryId: 'personal' })];
      const { page, mockAlertCtrl } = buildPage([personalCat], tasks);
      page.ngOnInit();

      const fakeAlert = { present: jest.fn() };
      mockAlertCtrl.create.mockResolvedValue(fakeAlert);

      await page.confirmDelete(personalCat);

      const [config] = mockAlertCtrl.create.mock.calls[0];
      expect(config.message).toContain('1 tarea');
    });

    it('muestra mensaje simple si no hay tareas asignadas', async () => {
      const { page, mockAlertCtrl } = buildPage([personalCat]);
      page.ngOnInit();

      const fakeAlert = { present: jest.fn() };
      mockAlertCtrl.create.mockResolvedValue(fakeAlert);

      await page.confirmDelete(personalCat);

      const [config] = mockAlertCtrl.create.mock.calls[0];
      expect(config.message).not.toContain('tarea');
    });
  });
});
