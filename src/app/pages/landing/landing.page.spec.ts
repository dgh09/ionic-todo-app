// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonContent: class IonContent {},
  IonIcon: class IonIcon {},
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({
  rocketOutline: null, layersOutline: null, trophyOutline: null, arrowForward: null,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { LandingPage } from './landing.page';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
const mockRouter = { navigate: jest.fn() };

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildPage() {
  const page = new LandingPage(mockRouter as any);
  return { page };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('LandingPage', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('currentSlide empieza en 0', () => {
      const { page } = buildPage();
      expect(page.currentSlide).toBe(0);
    });
  });

  // ── nextSlide ───────────────────────────────────────────────────────────────
  describe('nextSlide', () => {
    it('avanza al siguiente slide', () => {
      const { page } = buildPage();
      page.nextSlide();
      expect(page.currentSlide).toBe(1);
    });

    it('no supera el slide 2', () => {
      const { page } = buildPage();
      page.nextSlide();
      page.nextSlide();
      page.nextSlide(); // intento extra
      expect(page.currentSlide).toBe(2);
    });
  });

  // ── goToSlide ───────────────────────────────────────────────────────────────
  describe('goToSlide', () => {
    it('navega al índice indicado', () => {
      const { page } = buildPage();
      page.goToSlide(2);
      expect(page.currentSlide).toBe(2);
    });

    it('puede volver al slide 0', () => {
      const { page } = buildPage();
      page.goToSlide(2);
      page.goToSlide(0);
      expect(page.currentSlide).toBe(0);
    });
  });

  // ── skipToEnd ───────────────────────────────────────────────────────────────
  describe('skipToEnd', () => {
    it('va directamente al slide 2 desde cualquier posición', () => {
      const { page } = buildPage();
      page.skipToEnd();
      expect(page.currentSlide).toBe(2);
    });
  });

  // ── goToApp ─────────────────────────────────────────────────────────────────
  describe('goToApp', () => {
    it('navega a /home', () => {
      const { page } = buildPage();
      page.goToApp();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  // ── goToLogin ───────────────────────────────────────────────────────────────
  describe('goToLogin', () => {
    it('navega a /login', () => {
      const { page } = buildPage();
      page.goToLogin();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
