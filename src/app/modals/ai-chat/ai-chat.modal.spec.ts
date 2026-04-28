// ─── Mocks de módulos externos ────────────────────────────────────────────────
jest.mock('@ionic/angular/standalone', () => ({
  IonHeader:       class IonHeader {},
  IonToolbar:      class IonToolbar {},
  IonContent:      class IonContent {},
  IonFooter:       class IonFooter {},
  IonIcon:         class IonIcon {},
  ModalController: jest.fn(),
}));
jest.mock('ionicons', () => ({ addIcons: jest.fn() }));
jest.mock('ionicons/icons', () => ({
  sendOutline: null, closeOutline: null, sparkles: null, sparklesOutline: null,
  checkmarkCircle: null, trashOutline: null, helpCircleOutline: null,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { BehaviorSubject } from 'rxjs';
import { AiChatModal } from './ai-chat.modal';
import { Task }     from '../../models/task.model';
import { Category } from '../../models/category.model';

// ─── Stubs de dependencias ────────────────────────────────────────────────────
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

const personalCat: Category = { id: 'personal', name: 'Personal', color: '#00f', icon: 'person', type: 'default' };

// ─── Factory ──────────────────────────────────────────────────────────────────
function buildModal(tasks: Task[] = []) {
  const tasks$ = new BehaviorSubject<Task[]>(tasks);

  const mockAiAgent    = { sendMessage: jest.fn() };
  const mockTaskService = { tasks$, add: jest.fn(), toggle: jest.fn(), delete: jest.fn() };
  const mockModalCtrl  = { dismiss: jest.fn() };

  const modal = new AiChatModal(
    mockAiAgent     as any,
    mockTaskService as any,
    mockModalCtrl   as any,
  );

  return { modal, mockAiAgent, mockTaskService, mockModalCtrl };
}

// ─── Suite ────────────────────────────────────────────────────────────────────
describe('AiChatModal', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Estado inicial ──────────────────────────────────────────────────────────
  describe('estado inicial', () => {
    it('messages empieza vacío antes de ngOnInit', () => {
      const { modal } = buildModal();
      expect(modal.messages).toHaveLength(0);
    });

    it('inputText empieza vacío', () => {
      const { modal } = buildModal();
      expect(modal.inputText).toBe('');
    });

    it('isLoading empieza en false', () => {
      const { modal } = buildModal();
      expect(modal.isLoading).toBe(false);
    });
  });

  // ── ngOnInit ────────────────────────────────────────────────────────────────
  describe('ngOnInit', () => {
    it('agrega el mensaje de bienvenida del asistente', () => {
      const { modal } = buildModal();
      modal.ngOnInit();
      expect(modal.messages).toHaveLength(1);
      expect(modal.messages[0].role).toBe('model');
      expect(modal.messages[0].type).toBe('chat');
    });

    it('el mensaje de bienvenida menciona las capacidades del asistente', () => {
      const { modal } = buildModal();
      modal.ngOnInit();
      expect(modal.messages[0].text).toContain('asistente');
    });
  });

  // ── dismiss ─────────────────────────────────────────────────────────────────
  describe('dismiss', () => {
    it('llama a modalCtrl.dismiss', () => {
      const { modal, mockModalCtrl } = buildModal();
      modal.dismiss();
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });
  });

  // ── onKeydown ────────────────────────────────────────────────────────────────
  describe('onKeydown', () => {
    it('llama a send() al presionar Enter sin Shift', () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'hola';
      mockAiAgent.sendMessage.mockResolvedValue({ action: 'chat', reply: 'Hola!' });

      const event = { key: 'Enter', shiftKey: false, preventDefault: jest.fn() } as any;
      modal.onKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('no llama a send() al presionar Enter con Shift', () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      const spy = jest.spyOn(modal, 'send');

      const event = { key: 'Enter', shiftKey: true, preventDefault: jest.fn() } as any;
      modal.onKeydown(event);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── send — guardias ──────────────────────────────────────────────────────────
  describe('send — guardias', () => {
    it('no envía nada si inputText está vacío', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = '';
      await modal.send();
      expect(mockAiAgent.sendMessage).not.toHaveBeenCalled();
    });

    it('no envía nada si isLoading es true', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'hola';
      modal.isLoading = true;
      await modal.send();
      expect(mockAiAgent.sendMessage).not.toHaveBeenCalled();
    });

    it('agrega el mensaje del usuario al historial visible', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Agrega una tarea';
      mockAiAgent.sendMessage.mockResolvedValue({ action: 'chat', reply: 'Hecho' });

      await modal.send();

      const userMessages = modal.messages.filter(m => m.role === 'user');
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].text).toBe('Agrega una tarea');
    });

    it('limpia inputText tras enviar', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Texto';
      mockAiAgent.sendMessage.mockResolvedValue({ action: 'chat', reply: 'Ok' });
      await modal.send();
      expect(modal.inputText).toBe('');
    });

    it('isLoading vuelve a false al terminar', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Texto';
      mockAiAgent.sendMessage.mockResolvedValue({ action: 'chat', reply: 'Ok' });
      await modal.send();
      expect(modal.isLoading).toBe(false);
    });
  });

  // ── send — acción create_task ────────────────────────────────────────────────
  describe('send — acción create_task', () => {
    it('llama a taskService.add con los datos de la tarea creada', async () => {
      const { modal, mockAiAgent, mockTaskService } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Crea una tarea';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'create_task',
        reply: 'Tarea creada',
        taskCreated: { title: 'Nueva tarea', description: '', categoryId: null, priority: 'medium', price: undefined },
      });

      await modal.send();

      expect(mockTaskService.add).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nueva tarea', completed: false }),
      );
    });

    it('agrega mensaje de respuesta con type create_task', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Crea tarea';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'create_task',
        reply: '¡Listo! Tarea creada.',
        taskCreated: { title: 'T', description: '', categoryId: null, priority: 'low' },
      });

      await modal.send();

      const response = modal.messages.find(m => m.type === 'create_task');
      expect(response?.text).toBe('¡Listo! Tarea creada.');
    });
  });

  // ── send — acción complete_task ──────────────────────────────────────────────
  describe('send — acción complete_task', () => {
    it('llama a taskService.toggle cuando encuentra la tarea por título', async () => {
      const task = makeTask({ id: 'abc', title: 'Comprar leche' });
      const { modal, mockAiAgent, mockTaskService } = buildModal([task]);
      modal.ngOnInit();
      modal.inputText = 'Completa comprar leche';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'complete_task',
        reply: 'Tarea completada',
        taskTitle: 'comprar leche',
      });

      await modal.send();

      expect(mockTaskService.toggle).toHaveBeenCalledWith('abc');
    });

    it('muestra error si no encuentra la tarea', async () => {
      const { modal, mockAiAgent } = buildModal([]);
      modal.ngOnInit();
      modal.inputText = 'Completa tarea inexistente';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'complete_task',
        reply: 'Ok',
        taskTitle: 'tarea inexistente',
      });

      await modal.send();

      const errMsg = modal.messages[modal.messages.length - 1];
      expect(errMsg.text).toContain('No encontré');
    });
  });

  // ── send — acción delete_task ────────────────────────────────────────────────
  describe('send — acción delete_task', () => {
    it('llama a taskService.delete cuando encuentra la tarea por título', async () => {
      const task = makeTask({ id: 'xyz', title: 'Llamar médico' });
      const { modal, mockAiAgent, mockTaskService } = buildModal([task]);
      modal.ngOnInit();
      modal.inputText = 'Elimina llamar médico';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'delete_task',
        reply: 'Tarea eliminada',
        taskTitle: 'llamar médico',
      });

      await modal.send();

      expect(mockTaskService.delete).toHaveBeenCalledWith('xyz');
    });

    it('muestra error si no encuentra la tarea a eliminar', async () => {
      const { modal, mockAiAgent } = buildModal([]);
      modal.ngOnInit();
      modal.inputText = 'Elimina tarea inexistente';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'delete_task',
        reply: 'Ok',
        taskTitle: 'tarea inexistente',
      });

      await modal.send();

      const errMsg = modal.messages[modal.messages.length - 1];
      expect(errMsg.text).toContain('No encontré');
    });
  });

  // ── send — acción ask_clarification ─────────────────────────────────────────
  describe('send — acción ask_clarification', () => {
    it('agrega la respuesta con type ask_clarification', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'algo ambiguo';
      mockAiAgent.sendMessage.mockResolvedValue({
        action: 'ask_clarification',
        reply: '¿A qué categoría quieres asignarlo?',
      });

      await modal.send();

      const msg = modal.messages.find(m => m.type === 'ask_clarification');
      expect(msg?.text).toBe('¿A qué categoría quieres asignarlo?');
    });
  });

  // ── send — error de red ──────────────────────────────────────────────────────
  describe('send — error de red', () => {
    it('muestra mensaje de error si aiAgent lanza excepción', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Texto';
      mockAiAgent.sendMessage.mockRejectedValue(new Error('Network error'));

      await modal.send();

      const errMsg = modal.messages[modal.messages.length - 1];
      expect(errMsg.role).toBe('model');
      expect(errMsg.text).toContain('error');
    });

    it('isLoading vuelve a false aunque haya error', async () => {
      const { modal, mockAiAgent } = buildModal();
      modal.ngOnInit();
      modal.inputText = 'Texto';
      mockAiAgent.sendMessage.mockRejectedValue(new Error('fail'));

      await modal.send();

      expect(modal.isLoading).toBe(false);
    });
  });
});
