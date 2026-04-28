// ─── Mocks de módulos externos ────────────────────────────────────────────────
// AuthService usa dynamic imports de firebase/auth — se mockean para aislar
// la lógica de negocio sin depender de una app Firebase real.
jest.mock('firebase/auth', () => ({
  getAuth:                    jest.fn().mockReturnValue({}),
  onAuthStateChanged:         jest.fn(),
  signInWithEmailAndPassword:  jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile:              jest.fn(),
  signOut:                    jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { AuthService } from './auth.service';
import * as firebaseAuth from 'firebase/auth';

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildService() {
  const service = new AuthService();
  return { service };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('user$ emite null antes de inicializar', (done) => {
      const { service } = buildService();
      service.user$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('isAuthenticated retorna false sin usuario', () => {
      const { service } = buildService();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('getUser retorna null sin usuario', () => {
      const { service } = buildService();
      expect(service.getUser()).toBeNull();
    });
  });

  // ── markReady ───────────────────────────────────────────────────────────────
  describe('markReady', () => {
    it('userReady$ emite tras llamar markReady', (done) => {
      const { service } = buildService();
      service.userReady$.subscribe(() => done());
      service.markReady();
    });
  });

  // ── initialize ───────────────────────────────────────────────────────────────
  describe('initialize', () => {
    it('marca como ready aunque Firebase falle con app nula', async () => {
      (firebaseAuth.getAuth as jest.Mock).mockImplementation(() => { throw new Error('no app'); });
      const { service } = buildService();

      let ready = false;
      service.userReady$.subscribe(() => (ready = true));
      await service.initialize({} as any);

      expect(ready).toBe(true);
    });

    it('llama a onAuthStateChanged cuando Firebase está disponible', async () => {
      (firebaseAuth.getAuth as jest.Mock).mockReturnValue({ app: true });
      (firebaseAuth.onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => cb(null));
      const { service } = buildService();

      await service.initialize({} as any);

      expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalled();
    });

    it('mapea el usuario de Firebase al modelo AuthUser', async () => {
      const fakeUser = { uid: 'u1', email: 'a@b.com', displayName: 'Ana' };
      (firebaseAuth.getAuth as jest.Mock).mockReturnValue({ app: true });
      (firebaseAuth.onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => cb(fakeUser));
      const { service } = buildService();

      await service.initialize({} as any);
      const user = service.getUser();

      expect(user?.uid).toBe('u1');
      expect(user?.email).toBe('a@b.com');
      expect(user?.displayName).toBe('Ana');
    });
  });

  // ── signIn — modo demo (sin Firebase) ───────────────────────────────────────
  describe('signIn — modo demo', () => {
    it('establece el usuario con uid derivado del email', async () => {
      const { service } = buildService();
      await service.signIn('test@test.com', '123456');
      const user = service.getUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@test.com');
      expect(user?.uid).toBeTruthy();
    });

    it('usa la parte local del email como displayName', async () => {
      const { service } = buildService();
      await service.signIn('maria@correo.com', '123456');
      expect(service.getUser()?.displayName).toBe('maria');
    });

    it('isAuthenticated retorna true tras login exitoso', async () => {
      const { service } = buildService();
      await service.signIn('test@test.com', '123456');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('user$ emite el usuario tras login', (done) => {
      const { service } = buildService();
      service.signIn('test@test.com', '123456').then(() => {
        service.user$.subscribe(user => {
          if (user) {
            expect(user.email).toBe('test@test.com');
            done();
          }
        });
      });
    });
  });

  // ── signIn — modo Firebase ───────────────────────────────────────────────────
  describe('signIn — modo Firebase', () => {
    it('llama a signInWithEmailAndPassword con las credenciales correctas', async () => {
      const fakeUser = { uid: 'fb1', email: 'a@b.com', displayName: 'Ana' };
      (firebaseAuth.signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: fakeUser });
      const { service } = buildService();
      (service as any).firebaseAuth = { app: true };

      await service.signIn('a@b.com', 'pass123');

      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        { app: true }, 'a@b.com', 'pass123',
      );
    });
  });

  // ── register — modo demo (sin Firebase) ────────────────────────────────────
  describe('register — modo demo', () => {
    it('crea el usuario con email y displayName proporcionado', async () => {
      const { service } = buildService();
      await service.register('nuevo@test.com', '123456', 'Carlos');
      const user = service.getUser();
      expect(user?.email).toBe('nuevo@test.com');
      expect(user?.displayName).toBe('Carlos');
    });

    it('usa la parte local del email como displayName si no se pasa nombre', async () => {
      const { service } = buildService();
      await service.register('ana@test.com', '123456');
      expect(service.getUser()?.displayName).toBe('ana');
    });

    it('isAuthenticated retorna true tras registro', async () => {
      const { service } = buildService();
      await service.register('nuevo@test.com', '123456', 'Nuevo');
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  // ── register — modo Firebase ─────────────────────────────────────────────────
  describe('register — modo Firebase', () => {
    it('llama a createUserWithEmailAndPassword y updateProfile', async () => {
      const fakeUser = { uid: 'fb2', email: 'b@c.com', displayName: null };
      (firebaseAuth.createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: fakeUser });
      (firebaseAuth.updateProfile as jest.Mock).mockResolvedValue(undefined);
      const { service } = buildService();
      (service as any).firebaseAuth = { app: true };

      await service.register('b@c.com', 'pass123', 'Bob');

      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith({ app: true }, 'b@c.com', 'pass123');
      expect(firebaseAuth.updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Bob' });
    });
  });

  // ── signOut ─────────────────────────────────────────────────────────────────
  describe('signOut', () => {
    it('limpia el usuario del stream', async () => {
      const { service } = buildService();
      await service.signIn('test@test.com', '123456');
      await service.signOut();
      expect(service.getUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('llama a signOut de Firebase cuando hay sesión activa', async () => {
      (firebaseAuth.signOut as jest.Mock).mockResolvedValue(undefined);
      const { service } = buildService();
      (service as any).firebaseAuth = { app: true };

      await service.signOut();

      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });
  });

  // ── getUser / isAuthenticated ────────────────────────────────────────────────
  describe('getUser / isAuthenticated', () => {
    it('getUser retorna el usuario actual tras login', async () => {
      const { service } = buildService();
      await service.signIn('user@test.com', '123456');
      expect(service.getUser()?.email).toBe('user@test.com');
    });

    it('isAuthenticated cambia de false a true tras login', async () => {
      const { service } = buildService();
      expect(service.isAuthenticated()).toBe(false);
      await service.signIn('user@test.com', '123456');
      expect(service.isAuthenticated()).toBe(true);
    });
  });
});
