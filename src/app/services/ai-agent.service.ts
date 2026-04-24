import { Injectable } from '@angular/core';
import { Category } from '../models/category.model';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AgentResult {
  reply: string;
  taskCreated?: {
    title: string;
    description?: string;
    categoryId?: string;
    priority: 'low' | 'medium' | 'high';
    price?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AiAgentService {

  async sendMessage(
    history: ChatMessage[],
    userMessage: string,
    categories: Category[]
  ): Promise<AgentResult> {
    const { getApp } = await import('firebase/app');
    const { getFunctions, httpsCallable } = await import('firebase/functions');

    const functions = getFunctions(getApp());
    const chatFn = httpsCallable<
      { history: ChatMessage[]; userMessage: string; categories: Pick<Category, 'id' | 'name'>[] },
      { raw: string }
    >(functions, 'chatWithGroq');

    const result = await chatFn({
      history,
      userMessage,
      categories: categories.map(c => ({ id: c.id, name: c.name })),
    });

    const rawText = result.data.raw ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { reply: rawText };
    }

    if (parsed.action === 'create_task' && parsed.title) {
      return {
        reply: parsed.message ?? `Listo, agregué "${parsed.title}" ✓`,
        taskCreated: {
          title: parsed.title,
          description: parsed.description ?? undefined,
          categoryId: parsed.categoryId ?? undefined,
          priority: (['low', 'medium', 'high'].includes(parsed.priority)
            ? parsed.priority : 'medium') as 'low' | 'medium' | 'high',
          price: typeof parsed.price === 'number' ? parsed.price : undefined,
        },
      };
    }

    return { reply: parsed.message ?? parsed.reply ?? 'No entendí tu mensaje, intenta de nuevo.' };
  }
}
