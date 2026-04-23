import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, closeOutline, sparkles, sparklesOutline } from 'ionicons/icons';

import { AiAgentService, ChatMessage } from '../../services/ai-agent.service';
import { TaskService } from '../../services/task.service';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.modal.html',
  styleUrls: ['./ai-chat.modal.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon],
})
export class AiChatModal implements OnInit {
  @Input() categories: Category[] = [];
  @ViewChild(IonContent) ionContent!: IonContent;

  messages: Array<{ role: 'user' | 'model'; text: string }> = [];
  inputText = '';
  isLoading = false;

  private history: ChatMessage[] = [];

  constructor(
    private aiAgent: AiAgentService,
    private taskService: TaskService,
    private modalCtrl: ModalController
  ) {
    addIcons({ sendOutline, closeOutline, sparkles, sparklesOutline });
  }

  ngOnInit(): void {
    this.messages.push({
      role: 'model',
      text: '¡Hola! Soy tu asistente. Puedes pedirme que agregue tareas con lenguaje natural. Por ejemplo: "Quiero comprar 3 kilos de papas" o "Recuérdame llamar al médico mañana".',
    });
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.inputText = '';
    this.messages.push({ role: 'user', text });
    this.isLoading = true;
    this.scrollToBottom();

    try {
      const result = await this.aiAgent.sendMessage(this.history, text, this.categories);

      if (result.taskCreated) {
        this.taskService.add({
          title: result.taskCreated.title,
          description: result.taskCreated.description,
          categoryId: result.taskCreated.categoryId ?? null,
          priority: result.taskCreated.priority as 'low' | 'medium' | 'high',
          completed: false,
          price: result.taskCreated.price,
        });
      }

      this.history.push({ role: 'user', text });
      this.history.push({ role: 'model', text: result.reply });

      this.messages.push({ role: 'model', text: result.reply });
    } catch {
      this.messages.push({
        role: 'model',
        text: 'Hubo un error al conectarme. Verifica tu conexión e intenta de nuevo.',
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

  private scrollToBottom(): void {
    setTimeout(() => this.ionContent?.scrollToBottom(300), 50);
  }
}
