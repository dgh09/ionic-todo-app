import { RemoteConfigService } from './remote-config.service';

describe('RemoteConfigService', () => {
  let service: RemoteConfigService;

  beforeEach(() => {
    service = new RemoteConfigService();
  });

  describe('valores por defecto (sin Firebase)', () => {
    it('show_priority es true por defecto', (done) => {
      service.flags$.subscribe(flags => {
        expect(flags['show_priority']).toBe(true);
        done();
      });
    });

    it('show_stats_banner es true por defecto', (done) => {
      service.flags$.subscribe(flags => {
        expect(flags['show_stats_banner']).toBe(true);
        done();
      });
    });

    it('max_tasks_per_category es 50 por defecto', (done) => {
      service.flags$.subscribe(flags => {
        expect(flags['max_tasks_per_category']).toBe(50);
        done();
      });
    });
  });

  describe('getBoolean', () => {
    it('retorna el valor booleano del flag', () => {
      expect(service.getBoolean('show_priority')).toBe(true);
    });

    it('retorna false para una key inexistente', () => {
      expect(service.getBoolean('flag_inexistente')).toBe(false);
    });
  });

  describe('getNumber', () => {
    it('retorna el valor numérico del flag', () => {
      expect(service.getNumber('max_tasks_per_category')).toBe(50);
    });

    it('retorna 0 para una key inexistente', () => {
      expect(service.getNumber('key_inexistente')).toBe(0);
    });
  });

  describe('getString', () => {
    it('retorna string vacío para una key inexistente', () => {
      expect(service.getString('key_inexistente')).toBe('');
    });
  });

  describe('initialize — falla silenciosamente sin Firebase', () => {
    it('mantiene los defaults cuando Firebase falla', async () => {
      await service.initialize(null);
      expect(service.getBoolean('show_priority')).toBe(true);
      expect(service.getBoolean('show_stats_banner')).toBe(true);
    });
  });
});
