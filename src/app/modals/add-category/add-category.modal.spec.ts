// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonContent:      class IonContent {},
  IonIcon:         class IonIcon {},
  ModalController: jest.fn(),
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({
  close: null, add: null, checkmark: null, cart: null,
  folder: null, briefcase: null, person: null, home: null,
  book: null, heart: null, star: null, musicalNotes: null,
  airplane: null, car: null, leaf: null, pizza: null,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { AddCategoryModal, CATEGORY_COLORS, CATEGORY_ICONS } from './add-category.modal';
import { Category } from '../../models/category.model';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
const mockModalCtrl = { dismiss: jest.fn() };

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildModal(category?: Category) {
  const modal = new AddCategoryModal(mockModalCtrl as any);
  if (category) modal.category = category;
  modal.ngOnInit();
  return { modal };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('AddCategoryModal', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('name empieza vacío', () => {
      const { modal } = buildModal();
      expect(modal.name).toBe('');
    });

    it('color empieza con el primer valor de CATEGORY_COLORS', () => {
      const { modal } = buildModal();
      expect(modal.color).toBe(CATEGORY_COLORS[0]);
    });

    it('icon empieza con el primer valor de CATEGORY_ICONS', () => {
      const { modal } = buildModal();
      expect(modal.icon).toBe(CATEGORY_ICONS[0]);
    });

    it('isShopping empieza en false', () => {
      const { modal } = buildModal();
      expect(modal.isShopping).toBe(false);
    });
  });

  // ── isValid ─────────────────────────────────────────────────────────────────
  describe('isValid', () => {
    it('retorna false cuando el nombre está vacío', () => {
      const { modal } = buildModal();
      modal.name = '';
      expect(modal.isValid).toBe(false);
    });

    it('retorna false cuando el nombre es solo espacios', () => {
      const { modal } = buildModal();
      modal.name = '   ';
      expect(modal.isValid).toBe(false);
    });

    it('retorna true cuando el nombre tiene contenido', () => {
      const { modal } = buildModal();
      modal.name = 'Trabajo';
      expect(modal.isValid).toBe(true);
    });
  });

  // ── cancel ──────────────────────────────────────────────────────────────────
  describe('cancel', () => {
    it('llama a modalCtrl.dismiss con null y role cancel', () => {
      const { modal } = buildModal();
      modal.cancel();
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  // ── confirm ─────────────────────────────────────────────────────────────────
  describe('confirm', () => {
    it('no hace dismiss si el nombre está vacío', () => {
      const { modal } = buildModal();
      modal.name = '';
      modal.confirm();
      expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
    });

    it('hace dismiss con los datos correctos y role confirm', () => {
      const { modal } = buildModal();
      modal.name  = 'Salud';
      modal.color = '#2dd36f';
      modal.icon  = 'heart';
      modal.confirm();
      expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
        { name: 'Salud', color: '#2dd36f', icon: 'heart', type: 'default' },
        'confirm',
      );
    });

    it('envía type shopping cuando isShopping es true', () => {
      const { modal } = buildModal();
      modal.name      = 'Mercado';
      modal.isShopping = true;
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.type).toBe('shopping');
    });

    it('envía type default cuando isShopping es false', () => {
      const { modal } = buildModal();
      modal.name = 'Trabajo';
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.type).toBe('default');
    });

    it('recorta espacios del nombre al confirmar', () => {
      const { modal } = buildModal();
      modal.name = '  Hogar  ';
      modal.confirm();
      const [data] = mockModalCtrl.dismiss.mock.calls[0];
      expect(data.name).toBe('Hogar');
    });
  });

  // ── ngOnInit — edición ──────────────────────────────────────────────────────
  describe('ngOnInit — edición', () => {
    it('pre-carga los datos de la categoría recibida', () => {
      const cat: Category = { id: 'work', name: 'Trabajo', color: '#3880ff', icon: 'briefcase', type: 'default' };
      const { modal } = buildModal(cat);
      expect(modal.name).toBe('Trabajo');
      expect(modal.color).toBe('#3880ff');
      expect(modal.icon).toBe('briefcase');
      expect(modal.isShopping).toBe(false);
    });

    it('marca isShopping en true si el type es shopping', () => {
      const cat: Category = { id: 'shop', name: 'Tienda', color: '#f00', icon: 'cart', type: 'shopping' };
      const { modal } = buildModal(cat);
      expect(modal.isShopping).toBe(true);
    });

    it('marca isShopping en true si el id es shopping aunque el type no coincida', () => {
      const cat: Category = { id: 'shopping', name: 'Shopping', color: '#f00', icon: 'cart', type: 'default' };
      const { modal } = buildModal(cat);
      expect(modal.isShopping).toBe(true);
    });
  });
});
