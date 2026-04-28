// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonContent: class IonContent {},
  IonIcon:    class IonIcon {},
  IonSpinner: class IonSpinner {},
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({
  arrowBack: null, mailOutline: null, lockClosedOutline: null, personOutline: null,
  eyeOutline: null, eyeOffOutline: null, alertCircleOutline: null,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { LoginPage } from './login.page';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
const mockAuthService = { signIn: jest.fn(), register: jest.fn() };
const mockRouter      = { navigate: jest.fn() };

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildPage() {
  const page = new LoginPage(mockAuthService as any, mockRouter as any);
  return { page };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('mode empieza en login', () => {
      const { page } = buildPage();
      expect(page.mode).toBe('login');
    });

    it('errorMsg empieza vacío', () => {
      const { page } = buildPage();
      expect(page.errorMsg).toBe('');
    });

    it('loading empieza en false', () => {
      const { page } = buildPage();
      expect(page.loading).toBe(false);
    });
  });

  // ── setMode ─────────────────────────────────────────────────────────────────
  describe('setMode', () => {
    it('cambia el modo a register', () => {
      const { page } = buildPage();
      page.setMode('register');
      expect(page.mode).toBe('register');
    });

    it('limpia errorMsg al cambiar de modo', () => {
      const { page } = buildPage();
      page.errorMsg = 'Error previo';
      page.setMode('login');
      expect(page.errorMsg).toBe('');
    });
  });

  // ── goBack ──────────────────────────────────────────────────────────────────
  describe('goBack', () => {
    it('navega a la ruta raíz con replaceUrl', () => {
      const { page } = buildPage();
      page.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
    });
  });

  // ── submit — validaciones ───────────────────────────────────────────────────
  describe('submit — validaciones', () => {
    it('muestra error si email está vacío', async () => {
      const { page } = buildPage();
      page.email = '';
      page.password = '123456';
      await page.submit();
      expect(page.errorMsg).toBe('Completa todos los campos.');
    });

    it('muestra error si password está vacía', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '';
      await page.submit();
      expect(page.errorMsg).toBe('Completa todos los campos.');
    });

    it('muestra error si el email no tiene formato válido', async () => {
      const { page } = buildPage();
      page.email = 'no-es-un-email';
      page.password = '123456';
      await page.submit();
      expect(page.errorMsg).toBe('Ingresa un correo válido.');
    });

    it('muestra error si en register el nombre está vacío', async () => {
      const { page } = buildPage();
      page.setMode('register');
      page.email = 'test@test.com';
      page.password = '123456';
      page.name = '';
      await page.submit();
      expect(page.errorMsg).toBe('Ingresa tu nombre.');
    });

    it('muestra error si en register la contraseña tiene menos de 6 caracteres', async () => {
      const { page } = buildPage();
      page.setMode('register');
      page.email = 'test@test.com';
      page.password = '123';
      page.name = 'Juan';
      await page.submit();
      expect(page.errorMsg).toBe('La contraseña debe tener al menos 6 caracteres.');
    });
  });

  // ── submit — login exitoso ──────────────────────────────────────────────────
  describe('submit — login exitoso', () => {
    beforeEach(() => {
      mockAuthService.signIn.mockResolvedValue({});
    });

    it('llama a authService.signIn con email y password', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '123456';
      await page.submit();
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@test.com', '123456');
    });

    it('navega a /home con replaceUrl tras login exitoso', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '123456';
      await page.submit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
    });

    it('loading vuelve a false al terminar', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '123456';
      await page.submit();
      expect(page.loading).toBe(false);
    });
  });

  // ── submit — registro exitoso ───────────────────────────────────────────────
  describe('submit — registro exitoso', () => {
    beforeEach(() => {
      mockAuthService.register.mockResolvedValue({});
    });

    it('llama a authService.register con email, password y nombre', async () => {
      const { page } = buildPage();
      page.setMode('register');
      page.email = 'nuevo@test.com';
      page.password = '123456';
      page.name = 'María';
      await page.submit();
      expect(mockAuthService.register).toHaveBeenCalledWith('nuevo@test.com', '123456', 'María');
    });
  });

  // ── submit — errores de Firebase ────────────────────────────────────────────
  describe('submit — errores de Firebase', () => {
    it('muestra mensaje amigable para credenciales incorrectas', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '123456';
      mockAuthService.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
      await page.submit();
      expect(page.errorMsg).toBe('Correo o contraseña incorrectos.');
    });

    it('muestra mensaje genérico para errores desconocidos', async () => {
      const { page } = buildPage();
      page.email = 'test@test.com';
      page.password = '123456';
      mockAuthService.signIn.mockRejectedValue({ code: 'auth/unknown-error' });
      await page.submit();
      expect(page.errorMsg).toBe('Ocurrió un error. Intenta de nuevo.');
    });
  });
});
