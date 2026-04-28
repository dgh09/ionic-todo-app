// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonHeader:       class IonHeader {},
  IonToolbar:      class IonToolbar {},
  IonContent:      class IonContent {},
  IonIcon:         class IonIcon {},
  ModalController: jest.fn(),
  AlertController: jest.fn(),
  ToastController: jest.fn(),
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({}));
jest.mock('../modals/add-task/add-task.modal',  () => ({ AddTaskModal:  class AddTaskModal {} }));
jest.mock('../modals/ai-chat/ai-chat.modal',    () => ({ AiChatModal:   class AiChatModal {} }));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { BehaviorSubject } from 'rxjs';
import { HomePage } from './home.page';
import { Task }     from '../models/task.model';
import { Category } from '../models/category.model';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
const personalCat: Category = { id: 'personal', name: 'Personal', color: '#00f', icon: 'person', type: 'default' };
const shoppingCat: Category = { id: 'shopping', name: 'Shopping', color: '#f00', icon: 'cart',   type: 'shopping' };

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
function buildPage(tasks: Task[] = [], categories: Category[] = [personalCat]) {
  const filteredTasks$ = new BehaviorSubject<Task[]>(tasks);
  const categories$    = new BehaviorSubject<Category[]>(categories);
  const flags$         = new BehaviorSubject<Record<string, any>>({ show_priority: true, show_stats_banner: true });
  const user$          = new BehaviorSubject<any>({ displayName: 'Test', email: 'test@test.com' });

  const mockTaskService = {
    filteredTasks$,
    getStats:          jest.fn().mockReturnValue({
      total:     tasks.length,
      completed: tasks.filter(t => t.completed).length,
      active:    tasks.filter(t => !t.completed).length,
    }),
    setFilterCategory: jest.fn(),
    setFilterStatus:   jest.fn(),
    add:               jest.fn(),
    update:            jest.fn(),
    delete:            jest.fn(),
    toggle:            jest.fn(),
  };
  const mockCategoryService = { categories$ };
  const mockRemoteConfig    = { flags$ };
  const mockAuthService     = { user$, signOut: jest.fn() };
  const mockRouter          = { navigate: jest.fn() };
  const mockModalCtrl       = { create: jest.fn() };
  const mockAlertCtrl       = { create: jest.fn() };
  const mockToastCtrl       = { create: jest.fn() };
  const mockCdr             = { markForCheck: jest.fn() };

  const page = new HomePage(
    mockTaskService   as any,
    mockCategoryService as any,
    mockRemoteConfig  as any,
    mockAuthService   as any,
    mockRouter        as any,
    mockModalCtrl     as any,
    mockAlertCtrl     as any,
    mockToastCtrl     as any,
    mockCdr           as any,
  );

  return { page, mockTaskService, mockRouter };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('HomePage', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('filterStatus empieza en all', () => {
      const { page } = buildPage();
      expect(page.filterStatus).toBe('all');
    });

    it('selectedCategory empieza en null', () => {
      const { page } = buildPage();
      expect(page.selectedCategory).toBeNull();
    });

    it('searchQuery empieza vacío', () => {
      const { page } = buildPage();
      expect(page.searchQuery).toBe('');
    });
  });

  // ── getPriorityHex ──────────────────────────────────────────────────────────
  describe('getPriorityHex', () => {
    it('retorna rojo para high',            () => { expect(buildPage().page.getPriorityHex('high')).toBe('#FF4757'); });
    it('retorna naranja para medium',       () => { expect(buildPage().page.getPriorityHex('medium')).toBe('#F5A623'); });
    it('retorna verde para low',            () => { expect(buildPage().page.getPriorityHex('low')).toBe('#2EC27E'); });
    it('retorna neutro para valor inválido',() => { expect(buildPage().page.getPriorityHex('x')).toBe('#e8e9f0'); });
  });

  // ── getPriorityLabel ────────────────────────────────────────────────────────
  describe('getPriorityLabel', () => {
    it('mapea high → Alta',   () => { expect(buildPage().page.getPriorityLabel('high')).toBe('Alta'); });
    it('mapea medium → Media',() => { expect(buildPage().page.getPriorityLabel('medium')).toBe('Media'); });
    it('mapea low → Baja',    () => { expect(buildPage().page.getPriorityLabel('low')).toBe('Baja'); });
    it('devuelve el string original para valores desconocidos', () => {
      expect(buildPage().page.getPriorityLabel('custom')).toBe('custom');
    });
  });

  // ── progress ────────────────────────────────────────────────────────────────
  describe('progress', () => {
    it('retorna 0 cuando no hay tareas', () => {
      const { page } = buildPage();
      page.stats = { total: 0, completed: 0, active: 0 };
      expect(page.progress).toBe(0);
    });

    it('retorna 0.5 cuando la mitad están completadas', () => {
      const { page } = buildPage();
      page.stats = { total: 4, completed: 2, active: 2 };
      expect(page.progress).toBe(0.5);
    });

    it('retorna 1 cuando todas están completadas', () => {
      const { page } = buildPage();
      page.stats = { total: 3, completed: 3, active: 0 };
      expect(page.progress).toBe(1);
    });
  });

  // ── selectCategory ──────────────────────────────────────────────────────────
  describe('selectCategory', () => {
    it('actualiza selectedCategory y llama al servicio', () => {
      const { page, mockTaskService } = buildPage();
      page.selectCategory('personal');
      expect(page.selectedCategory).toBe('personal');
      expect(mockTaskService.setFilterCategory).toHaveBeenCalledWith('personal');
    });

    it('puede limpiar la categoría con null', () => {
      const { page, mockTaskService } = buildPage();
      page.selectCategory(null);
      expect(page.selectedCategory).toBeNull();
      expect(mockTaskService.setFilterCategory).toHaveBeenCalledWith(null);
    });
  });

  // ── setStatus ───────────────────────────────────────────────────────────────
  describe('setStatus', () => {
    it('actualiza filterStatus y llama al servicio', () => {
      const { page, mockTaskService } = buildPage();
      page.setStatus('completed');
      expect(page.filterStatus).toBe('completed');
      expect(mockTaskService.setFilterStatus).toHaveBeenCalledWith('completed');
    });
  });

  // ── onSearchChange / clearSearch ────────────────────────────────────────────
  describe('onSearchChange / clearSearch', () => {
    it('filtra tareas por título al buscar', () => {
      const tasks = [makeTask({ title: 'Comprar leche' }), makeTask({ title: 'Llamar médico' })];
      const { page } = buildPage(tasks);
      page.ngOnInit();
      page.searchQuery = 'leche';
      page.onSearchChange();
      expect(page.filteredTasks.length).toBe(1);
      expect(page.filteredTasks[0].title).toBe('Comprar leche');
    });

    it('clearSearch restaura todas las tareas', () => {
      const tasks = [makeTask({ title: 'T1' }), makeTask({ title: 'T2' })];
      const { page } = buildPage(tasks);
      page.ngOnInit();
      page.searchQuery = 'T1';
      page.onSearchChange();
      page.clearSearch();
      expect(page.searchQuery).toBe('');
      expect(page.filteredTasks.length).toBe(2);
    });
  });

  // ── isShoppingView ──────────────────────────────────────────────────────────
  describe('isShoppingView', () => {
    it('retorna false sin categoría seleccionada', () => {
      const { page } = buildPage([], [shoppingCat, personalCat]);
      page.ngOnInit();
      expect(page.isShoppingView).toBe(false);
    });

    it('retorna true para la categoría shopping', () => {
      const { page } = buildPage([], [shoppingCat, personalCat]);
      page.ngOnInit();
      page.selectCategory('shopping');
      expect(page.isShoppingView).toBe(true);
    });

    it('retorna false para una categoría normal', () => {
      const { page } = buildPage([], [shoppingCat, personalCat]);
      page.ngOnInit();
      page.selectCategory('personal');
      expect(page.isShoppingView).toBe(false);
    });
  });

  // ── toggleTask ───────────────────────────────────────────────────────────────
  describe('toggleTask', () => {
    it('llama a taskService.toggle con el id correcto', () => {
      const { page, mockTaskService } = buildPage();
      page.toggleTask(makeTask({ id: 'task-1' }));
      expect(mockTaskService.toggle).toHaveBeenCalledWith('task-1');
    });
  });

  // ── getCategoryById ──────────────────────────────────────────────────────────
  describe('getCategoryById', () => {
    it('retorna la categoría correcta por id', () => {
      const { page } = buildPage([], [personalCat, shoppingCat]);
      page.ngOnInit();
      expect(page.getCategoryById('personal')?.name).toBe('Personal');
    });

    it('retorna undefined para id nulo', () => {
      const { page } = buildPage([], [personalCat]);
      page.ngOnInit();
      expect(page.getCategoryById(null)).toBeUndefined();
    });
  });

  // ── ngOnInit — streams ──────────────────────────────────────────────────────
  describe('ngOnInit — streams', () => {
    it('carga el nombre del usuario desde el stream', () => {
      const { page } = buildPage();
      page.ngOnInit();
      expect(page.userName).toBe('Test');
    });

    it('carga las tareas del stream', () => {
      const tasks = [makeTask({ title: 'A' }), makeTask({ title: 'B' })];
      const { page } = buildPage(tasks);
      page.ngOnInit();
      expect(page.filteredTasks.length).toBe(2);
    });

    it('carga las categorías del stream', () => {
      const { page } = buildPage([], [personalCat, shoppingCat]);
      page.ngOnInit();
      expect(page.categories.length).toBe(2);
    });

    it('aplica los flags de remote config', () => {
      const { page } = buildPage();
      page.ngOnInit();
      expect(page.showPriority).toBe(true);
      expect(page.showStatsBanner).toBe(true);
    });
  });
});
