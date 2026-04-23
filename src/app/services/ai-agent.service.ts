import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

@Injectable({ providedIn: 'root' })
export class AiAgentService {

  async sendMessage(
    history: ChatMessage[],
    userMessage: string,
    categories: Category[]
  ): Promise<AgentResult> {
    const categoryList = categories.length
      ? categories.map(c => `- ${c.name} (id: "${c.id}")`).join('\n')
      : '(sin categorías)';

    const systemPrompt = `Eres un asistente para una app de lista de tareas en español.
Analiza el mensaje del usuario y responde ÚNICAMENTE con un JSON válido, sin markdown, sin bloques de código, sin texto adicional.

Cuando el usuario quiere crear una tarea, usa este formato:
{"action":"create_task","title":"...","description":null,"categoryId":null,"priority":"medium","price":null,"message":"Confirmación amigable"}

Cuando solo quiere conversar:
{"action":"chat","message":"Tu respuesta aquí"}

Reglas:
- priority debe ser "low", "medium" o "high" según la urgencia
- categoryId debe ser el id exacto de la lista o null si no aplica
- price es número o null
- description es string o null
- message siempre en español, amigable y breve

Categorías disponibles:
${categoryList}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ];

    const body = {
      model: MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.groqApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message ?? `Error ${response.status}`);
    }

    const data = await response.json();
    const rawText: string = data.choices?.[0]?.message?.content ?? '{}';

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
