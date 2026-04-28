jest.mock('@ionic/angular/standalone', () => ({
  IonContent: class IonContent {},
  IonIcon: class IonIcon {},
  ModalController: jest.fn(),
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({ close: null, add: null, checkmark: null }));

import { AddTaskModal } from './add-task.modal';
import { BehaviorSubject } from 'rxjs';
import { Category } from '../../models/category.model';

const shoppingCategory: Category = { id: 'shopping', name: 'Shopping', color: '#f00', icon: 'cart', type: 'shopping' };
const personalCategory: Category = { id: 'personal', name: 'Personal', color: '#00f', icon: 'person', type: 'default' };

const mockCategoryService = {
  categories$: new BehaviorSubject<Category[]>([personalCategory, shoppingCategory]),
};

const mockModalCtrl = {
  dismiss: jest.fn(),
};

function buildModal(): AddTaskModal {
  const modal = new AddTaskModal(mockModalCtrl as any, mockCategoryService as any);
  modal.ngOnInit();
  return modal;
}

describe('AddTaskModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCategoryService.categories$ = new BehaviorSubject<Category[]>([personalCategory, shoppingCategory]);
  });

  describe('isValid', () => {
    it('retorna false cuando el título está vacío', () => {
      const modal = buildModal();
      modal.title = '';
      expect(modal.isValid).toBe(false);
    });

    it('retorna false cuando el título es solo espacios', () => {
      const modal = buildModal();
      modal.title = '   ';
      expect(modal.isValid).toBe(false);
    });

    it('retorna true cuando el título tiene contenido', () => {
      const modal = buildModal();
      modal.title = 'Mi tarea';
      expect(modal.isValid).toBe(true);
    });
  });

  describe('isShoppingSelected', () => {
    it('retorna false cuando no hay categoría seleccionada', () => {
      const modal = buildModal();
      modal.categoryId = null;
      expect(modal.isShoppingSelected).toBe(false);
    });

    it('retorna false para una categoría de tipo default', () => {
      const modal = buildModal();
      modal.categoryId = 'personal';
      expect(modal.isShoppingSelected).toBe(false);
    });

    it('retorna true para la categoría shopping', () => {
      const modal = buildModal();
      modal.categoryId = 'shopping';
      expect(modal.isShoppingSelected).toBe(true);
    });
  });

  describe('cancel', () => {
    it('llama a modalCtrl.dismiss con null y cancel', () => {
      const modal = buildModal();
      modal.cancel();
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('confirm', () => {
    it('no hace dismiss si el título está vacío', () => {
      const modal = buildModal();
      modal.title = '';
      modal.confirm();
      expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
    });

    it('hace dismiss con los datos y role confirm', () => {
      const modal = buildModal();
      modal.title = 'Nueva tarea';
      modal.priority = 'high';
      modal.categoryId = 'personal';
      modal.confirm();
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
        { title: 'Nueva tarea', categoryId: 'personal', priority: 'high' },
        'confirm',
      );
    });

    it('incluye description si no está vacía', () => {
      const modal = buildModal();
      modal.title = 'Tarea con descripción';
      modal.description = 'Detalle importante';
      modal.categoryId = null;
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.description).toBe('Detalle importante');
    });

    it('incluye price al confirmar con categoría shopping', () => {
      const modal = buildModal();
      modal.title = 'Compra';
      modal.categoryId = 'shopping';
      modal.price = 15000;
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.price).toBe(15000);
    });

    it('no incluye price si la categoría no es shopping', () => {
      const modal = buildModal();
      modal.title = 'Tarea normal';
      modal.categoryId = 'personal';
      modal.price = 5000;
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.price).toBeUndefined();
    });
  });

  describe('onPriceInput', () => {
    it('extrae dígitos y actualiza price', () => {
      const modal = buildModal();
      const fakeInput = { value: '$ 12.500' } as HTMLInputElement;
      const event = { target: fakeInput } as unknown as Event;
      modal.onPriceInput(event);
      expect(modal.price).toBe(12500);
    });

    it('asigna null si el input queda sin dígitos', () => {
      const modal = buildModal();
      const fakeInput = { value: '' } as HTMLInputElement;
      const event = { target: fakeInput } as unknown as Event;
      modal.onPriceInput(event);
      expect(modal.price).toBeNull();
    });
  });

  describe('ngOnInit — edición', () => {
    it('pre-carga los datos cuando recibe una tarea existente', () => {
      const modal = new AddTaskModal(mockModalCtrl as any, mockCategoryService as any);
      modal.task = {
        id: 'abc', title: 'Editar', description: 'Desc', categoryId: 'personal',
        priority: 'high', completed: false, createdAt: new Date().toISOString(),
      } as any;
      modal.ngOnInit();
      expect(modal.title).toBe('Editar');
      expect(modal.description).toBe('Desc');
      expect(modal.priority).toBe('high');
      expect(modal.categoryId).toBe('personal');
    });
  });
});
