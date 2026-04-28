import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    service = new StorageService();
  });

  describe('get', () => {
    it('returns null when key does not exist', () => {
      expect(service.get('missing')).toBeNull();
    });

    it('returns parsed value when key exists', () => {
      localStorage.setItem('key', JSON.stringify({ name: 'test' }));
      expect(service.get('key')).toEqual({ name: 'test' });
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('bad', 'not-json{{{');
      expect(service.get('bad')).toBeNull();
    });
  });

  describe('set', () => {
    it('serializes and stores the value', () => {
      service.set('key', { count: 42 });
      expect(localStorage.getItem('key')).toBe('{"count":42}');
    });

    it('overwrites an existing value', () => {
      service.set('key', 'first');
      service.set('key', 'second');
      expect(service.get<string>('key')).toBe('second');
    });
  });

  describe('remove', () => {
    it('removes an existing key', () => {
      service.set('key', 'value');
      service.remove('key');
      expect(service.get('key')).toBeNull();
    });

    it('does not throw when key does not exist', () => {
      expect(() => service.remove('nonexistent')).not.toThrow();
    });
  });
});
