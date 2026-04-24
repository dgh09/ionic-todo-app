import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, closeOutline, sparkles, sparklesOutline, checkmarkCircle, trashOutline, helpCircleOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { AiAgentService, AgentAction, ChatMessage } from '../../services/ai-agent.service';
import { TaskService } from '../../services/task.service';
import { Category } from '../../models/category.model';
import { Task } from '../../models/task.model';

interface UIMessage {
  role: 'user' | 'model';
  text: string;
  type?: AgentAction;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.modal.html',
  styleUrls: ['./ai-chat.modal.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon],
})
export class AiChatModal implements OnInit, OnDestroy {
  @Input() categories: Category[] = [];
  @ViewChild(IonContent) ionContent!: IonContent;

  messages: UIMessage[] = [];
  inputText = '';
  isLoading = false;

  private tasks: Task[] = [];
  private history: ChatMessage[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private aiAgent: AiAgentService,
    private taskService: TaskService,
    private modalCtrl: ModalController
  ) {
    addIcons({ sendOutline, closeOutline, sparkles, sparklesOutline, checkmarkCircle, trashOutline, helpCircleOutline });
  }

  ngOnInit(): void {
    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => (this.tasks = tasks));

    this.messages.push({
      role: 'model',
      text: '¡Hola! Soy tu asistente. Puedo agregar, completar y eliminar tareas. Dime qué necesitas.',
      type: 'chat',
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.inputText = '';
    this.messages.push({ role: 'user', text });
    this.isLoading = true;
    this.scrollToBottom();

    try {
      const result = await this.aiAgent.sendMessage(this.history, text, this.categories, this.tasks);

      this.history.push({ role: 'user', text });
      this.history.push({ role: 'model', text: result.reply });

      switch (result.action) {
        case 'create_task':
          this.taskService.add({
            title: result.taskCreated!.title,
            description: result.taskCreated!.description,
            categoryId: result.taskCreated!.categoryId ?? null,
            priority: result.taskCreated!.priority,
            completed: false,
            price: result.taskCreated!.price,
          });
          this.messages.push({ role: 'model', text: result.reply, type: 'create_task' });
          break;

        case 'complete_task': {
          const task = this.findTaskByTitle(result.taskTitle ?? '');
          if (task) {
            this.taskService.toggle(task.id);
            this.messages.push({ role: 'model', text: result.reply, type: 'complete_task' });
          } else {
            this.messages.push({ role: 'model', text: `No encontré ninguna tarea con ese nombre en tu lista.`, type: 'chat' });
          }
          break;
        }

        case 'delete_task': {
          const task = this.findTaskByTitle(result.taskTitle ?? '');
          if (task) {
            this.taskService.delete(task.id);
            this.messages.push({ role: 'model', text: result.reply, type: 'delete_task' });
          } else {
            this.messages.push({ role: 'model', text: `No encontré ninguna tarea con ese nombre en tu lista.`, type: 'chat' });
          }
          break;
        }

        case 'ask_clarification':
          this.messages.push({ role: 'model', text: result.reply, type: 'ask_clarification' });
          break;

        default:
          this.messages.push({ role: 'model', text: result.reply, type: 'chat' });
      }
    } catch {
      this.messages.push({
        role: 'model',
        text: 'Hubo un error al conectarme. Verifica tu conexión e intenta de nuevo.',
        type: 'chat',
      });
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  private findTaskByTitle(title: string): Task | undefined {
    if (!title) return undefined;
    const q = title.toLowerCase().trim();
    return this.tasks.find(t =>
      t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase())
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => this.ionContent?.scrollToBottom(300), 50);
  }
}
