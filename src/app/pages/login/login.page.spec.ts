jest.mock('@ionic/angular/standalone', () => ({
  IonContent: class IonContent {},
  IonIcon: class IonIcon {},
  IonSpinner: class IonSpinner {},
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({
  arrowBack: null, mailOutline: null, lockClosedOutline: null, personOutline: null,
  eyeOutline: null, eyeOffOutline: null, alertCircleOutline: null,
}));

import { LoginPage } from './login.page';

const mockAuthService = {
  signIn: jest.fn(),
  register: jest.fn(),
};

const mockRouter = {
  navigate: jest.fn(),
};

describe('LoginPage', () => {
  let component: LoginPage;

  beforeEach(() => {
    jest.clearAllMocks();
    component = new LoginPage(mockAuthService as any, mockRouter as any);
  });

  describe('setMode', () => {
    it('cambia el modo a register', () => {
      component.setMode('register');
      expect(component.mode).toBe('register');
    });

    it('limpia el errorMsg al cambiar de modo', () => {
      component.errorMsg = 'Error previo';
      component.setMode('login');
      expect(component.errorMsg).toBe('');
    });
  });

  describe('goBack', () => {
    it('navega a la ruta raíz', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
    });
  });

  describe('submit — validaciones', () => {
    it('muestra error si email está vacío', async () => {
      component.email = '';
      component.password = '123456';
      await component.submit();
      expect(component.errorMsg).toBe('Completa todos los campos.');
    });

    it('muestra error si password está vacío', async () => {
      component.email = 'test@test.com';
      component.password = '';
      await component.submit();
      expect(component.errorMsg).toBe('Completa todos los campos.');
    });

    it('muestra error si email no es válido', async () => {
      component.email = 'no-es-un-email';
      component.password = '123456';
      await component.submit();
      expect(component.errorMsg).toBe('Ingresa un correo válido.');
    });

    it('muestra error si en register el nombre está vacío', async () => {
      component.setMode('register');
      component.email = 'test@test.com';
      component.password = '123456';
      component.name = '';
      await component.submit();
      expect(component.errorMsg).toBe('Ingresa tu nombre.');
    });

    it('muestra error si en register la contraseña tiene menos de 6 caracteres', async () => {
      component.setMode('register');
      component.email = 'test@test.com';
      component.password = '123';
      component.name = 'Juan';
      await component.submit();
      expect(component.errorMsg).toBe('La contraseña debe tener al menos 6 caracteres.');
    });
  });

  describe('submit — login exitoso', () => {
    beforeEach(() => {
      component.email = 'test@test.com';
      component.password = '123456';
      mockAuthService.signIn.mockResolvedValue({});
    });

    it('llama a authService.signIn con email y password', async () => {
      await component.submit();
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@test.com', '123456');
    });

    it('navega a /home tras login exitoso', async () => {
      await component.submit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
    });

    it('loading vuelve a false tras completar', async () => {
      await component.submit();
      expect(component.loading).toBe(false);
    });
  });

  describe('submit — registro exitoso', () => {
    beforeEach(() => {
      component.setMode('register');
      component.email = 'nuevo@test.com';
      component.password = '123456';
      component.name = 'María';
      mockAuthService.register.mockResolvedValue({});
    });

    it('llama a authService.register con los datos correctos', async () => {
      await component.submit();
      expect(mockAuthService.register).toHaveBeenCalledWith('nuevo@test.com', '123456', 'María');
    });
  });

  describe('submit — error de Firebase', () => {
    it('muestra mensaje amigable para credenciales incorrectas', async () => {
      component.email = 'test@test.com';
      component.password = '123456';
      mockAuthService.signIn.mockRejectedValue({ code: 'auth/invalid-credential' });
      await component.submit();
      expect(component.errorMsg).toBe('Correo o contraseña incorrectos.');
    });

    it('muestra mensaje genérico para errores desconocidos', async () => {
      component.email = 'test@test.com';
      component.password = '123456';
      mockAuthService.signIn.mockRejectedValue({ code: 'auth/unknown-error' });
      await component.submit();
      expect(component.errorMsg).toBe('Ocurrió un error. Intenta de nuevo.');
    });
  });
});
