// ─── Mocks de módulos externos ────────────────────────────────────────────────
// AiAgentService usa fetch nativo — se reemplaza en el objeto global de Jest
// para interceptar llamadas sin tocar la red real.

// ─── Imports ──────────────────────────────────────────────────────────────────
import { AiAgentService, ChatMessage } from './ai-agent.service';
import { Category } from '../models/category.model';
import { Task }     from '../models/task.model';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mockFetch(body: object, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    json: async () => body,
  });
}

function groqResponse(content: object) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}

const sampleCategories: Category[] = [
  { id: 'personal', name: 'Personal', color: '#00f', icon: 'person', type: 'default' },
  { id: 'shopping', name: 'Shopping', color: '#f00', icon: 'cart',   type: 'shopping' },
];

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'Tarea', completed: false,
    priority: 'low', categoryId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Task;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildService() {
  const service = new AiAgentService();
  return { service };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('AiAgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // ── sendMessage — acción chat ────────────────────────────────────────────────
  describe('sendMessage — acción chat', () => {
    it('retorna action chat con la respuesta del modelo', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'chat', message: '¡Hola!' }));

      const result = await service.sendMessage([], 'hola', sampleCategories, []);

      expect(result.action).toBe('chat');
      expect(result.reply).toBe('¡Hola!');
    });

    it('llama a fetch con la URL de Groq y Authorization header', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'chat', message: 'Ok' }));

      await service.sendMessage([], 'hola', [], []);

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('groq.com');
      expect(options.headers['Authorization']).toMatch(/^Bearer /);
    });

    it('incluye el historial de mensajes en el body de la petición', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'chat', message: 'Ok' }));
      const history: ChatMessage[] = [{ role: 'user', text: 'Anterior' }];

      await service.sendMessage(history, 'Nuevo', [], []);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      const hasHistory = body.messages.some((m: any) => m.content === 'Anterior');
      expect(hasHistory).toBe(true);
    });
  });

  // ── sendMessage — acción create_task ────────────────────────────────────────
  describe('sendMessage — acción create_task', () => {
    it('retorna taskCreated con los datos mapeados', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'create_task', title: 'Comprar leche',
        description: null, categoryId: 'shopping',
        priority: 'high', price: null,
        message: 'Tarea creada',
      }));

      const result = await service.sendMessage([], 'comprar leche urgente', sampleCategories, []);

      expect(result.action).toBe('create_task');
      expect(result.taskCreated?.title).toBe('Comprar leche');
      expect(result.taskCreated?.priority).toBe('high');
      expect(result.taskCreated?.categoryId).toBe('shopping');
    });

    it('normaliza prioridad inválida a medium', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'create_task', title: 'Test',
        priority: 'invalida', message: 'Ok',
      }));

      const result = await service.sendMessage([], 'crea tarea', [], []);

      expect(result.taskCreated?.priority).toBe('medium');
    });

    it('incluye price cuando el modelo lo devuelve como número', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'create_task', title: 'Compra', priority: 'medium',
        price: 15000, message: 'Ok',
      }));

      const result = await service.sendMessage([], 'compra cara', sampleCategories, []);

      expect(result.taskCreated?.price).toBe(15000);
    });

    it('omite price cuando el modelo no lo devuelve', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'create_task', title: 'Tarea', priority: 'low', message: 'Ok',
      }));

      const result = await service.sendMessage([], 'crea tarea', [], []);

      expect(result.taskCreated?.price).toBeUndefined();
    });

    it('usa reply de fallback si el modelo no envía message', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'create_task', title: 'T', priority: 'low' }));

      const result = await service.sendMessage([], 'crea', [], []);

      expect(result.reply).toContain('T');
    });
  });

  // ── sendMessage — acción complete_task ──────────────────────────────────────
  describe('sendMessage — acción complete_task', () => {
    it('retorna taskTitle con el título de la tarea a completar', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'complete_task', taskTitle: 'Comprar leche', message: 'Completada',
      }));

      const result = await service.sendMessage([], 'completa comprar leche', [], [makeTask({ title: 'Comprar leche' })]);

      expect(result.action).toBe('complete_task');
      expect(result.taskTitle).toBe('Comprar leche');
    });
  });

  // ── sendMessage — acción delete_task ────────────────────────────────────────
  describe('sendMessage — acción delete_task', () => {
    it('retorna taskTitle con el título de la tarea a eliminar', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'delete_task', taskTitle: 'Llamar médico', message: 'Eliminada',
      }));

      const result = await service.sendMessage([], 'elimina llamar médico', [], [makeTask({ title: 'Llamar médico' })]);

      expect(result.action).toBe('delete_task');
      expect(result.taskTitle).toBe('Llamar médico');
    });
  });

  // ── sendMessage — acción ask_clarification ──────────────────────────────────
  describe('sendMessage — acción ask_clarification', () => {
    it('retorna action ask_clarification con el mensaje del modelo', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({
        action: 'ask_clarification', message: '¿Con qué prioridad?',
      }));

      const result = await service.sendMessage([], 'agrega tarea', [], []);

      expect(result.action).toBe('ask_clarification');
      expect(result.reply).toBe('¿Con qué prioridad?');
    });
  });

  // ── sendMessage — error HTTP ─────────────────────────────────────────────────
  describe('sendMessage — error HTTP', () => {
    it('lanza error cuando la respuesta no es ok', async () => {
      const { service } = buildService();
      mockFetch({ error: { message: 'Unauthorized' } }, false);

      await expect(service.sendMessage([], 'hola', [], [])).rejects.toThrow('Unauthorized');
    });

    it('lanza error genérico si el body no tiene mensaje de error', async () => {
      const { service } = buildService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => { throw new Error(); },
      });

      await expect(service.sendMessage([], 'hola', [], [])).rejects.toThrow();
    });
  });

  // ── sendMessage — JSON inválido ──────────────────────────────────────────────
  describe('sendMessage — JSON inválido', () => {
    it('devuelve action chat con el texto crudo si el modelo no responde JSON', async () => {
      const { service } = buildService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'texto sin json' } }] }),
      });

      const result = await service.sendMessage([], 'hola', [], []);

      expect(result.action).toBe('chat');
      expect(result.reply).toBe('texto sin json');
    });
  });

  // ── sendMessage — sistema de contexto ───────────────────────────────────────
  describe('sendMessage — sistema de contexto', () => {
    it('incluye las categorías disponibles en el system prompt', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'chat', message: 'Ok' }));

      await service.sendMessage([], 'hola', sampleCategories, []);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      const systemMsg = body.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('Personal');
      expect(systemMsg.content).toContain('Shopping');
    });

    it('incluye las tareas actuales en el system prompt', async () => {
      const { service } = buildService();
      mockFetch(groqResponse({ action: 'chat', message: 'Ok' }));
      const tasks = [makeTask({ title: 'Ir al gym' })];

      await service.sendMessage([], 'hola', [], tasks);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      const systemMsg = body.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('Ir al gym');
    });
  });
});
