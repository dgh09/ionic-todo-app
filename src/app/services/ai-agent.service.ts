import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Category } from '../models/category.model';
import { Task } from '../models/task.model';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AgentAction = 'chat' | 'create_task' | 'complete_task' | 'delete_task' | 'ask_clarification';

export interface AgentResult {
  action: AgentAction;
  reply: string;
  taskCreated?: {
    title: string;
    description?: string;
    categoryId?: string;
    priority: 'low' | 'medium' | 'high';
    price?: number;
  };
  taskTitle?: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

@Injectable({ providedIn: 'root' })
export class AiAgentService {

  async sendMessage(
    history: ChatMessage[],
    userMessage: string,
    categories: Category[],
    tasks: Task[]
  ): Promise<AgentResult> {
    const categoryList = categories.length
      ? categories.map(c => `- ${c.name} (id: "${c.id}")`).join('\n')
      : '(sin categorías)';

    const taskList = tasks.length
      ? tasks.map(t => `- "${t.title}" (completada: ${t.completed ? 'sí' : 'no'})`).join('\n')
      : '(sin tareas)';

    const systemPrompt = `Eres un asistente inteligente para una app de lista de tareas. Respondes siempre en español y ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin texto antes o después del JSON.

## Acciones disponibles

Cuando el usuario quiere CREAR una tarea y conoces la prioridad:
{"action":"create_task","title":"...","description":null,"categoryId":null,"priority":"high|medium|low","price":null,"message":"..."}

Cuando el usuario quiere crear una tarea pero NO especifica prioridad (no dice urgente, importante, puede esperar, etc.):
{"action":"ask_clarification","message":"Claro, ¿con qué prioridad quieres agregar esta tarea? Alta, media o baja."}

Cuando el usuario quiere MARCAR como completada o pendiente una tarea:
{"action":"complete_task","taskTitle":"título de la tarea de la lista","message":"..."}

Cuando el usuario quiere ELIMINAR o BORRAR una tarea:
{"action":"delete_task","taskTitle":"título de la tarea de la lista","message":"..."}

Cuando el usuario quiere conversar o hacer preguntas:
{"action":"chat","message":"..."}

## Regla crítica de prioridad
- Indicadores de ALTA: "urgente", "importante", "hoy", "ya", "rápido", "prioritario"
- Indicadores de BAJA: "cuando pueda", "sin prisa", "después", "algún día", "tranquilo"
- Si el usuario NO menciona ningún indicador → usa ask_clarification. NO inventes prioridad.

## Categorías disponibles
${categoryList}

## Tareas actuales del usuario
${taskList}

## Ejemplos

Usuario: "agrega llamar al banco"
{"action":"ask_clarification","message":"Entendido. ¿Con qué prioridad quieres agregar 'Llamar al banco'? Alta, media o baja."}

Usuario: "alta"
{"action":"create_task","title":"Llamar al banco","description":null,"categoryId":null,"priority":"high","price":null,"message":"Listo, 'Llamar al banco' agregada con prioridad alta ✓"}

Usuario: "necesito comprar leche urgente"
{"action":"create_task","title":"Comprar leche","description":null,"categoryId":"shopping","priority":"high","price":null,"message":"Agregada con prioridad alta 🛒"}

Usuario: "marca como hecha la tarea de comprar leche"
{"action":"complete_task","taskTitle":"Comprar leche","message":"✓ 'Comprar leche' marcada como completada"}

Usuario: "elimina la tarea del banco"
{"action":"delete_task","taskTitle":"Llamar al banco","message":"🗑 'Llamar al banco' eliminada"}

Usuario: "¿cuántas tareas tengo?"
{"action":"chat","message":"Tienes ${tasks.length} tarea(s) en total."}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.groqApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
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
      return { action: 'chat', reply: rawText };
    }

    const action: AgentAction = parsed.action ?? 'chat';

    if (action === 'create_task' && parsed.title) {
      return {
        action,
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

    if (action === 'complete_task' || action === 'delete_task') {
      return {
        action,
        reply: parsed.message ?? '',
        taskTitle: parsed.taskTitle ?? '',
      };
    }

    return {
      action,
      reply: parsed.message ?? parsed.reply ?? 'No entendí tu mensaje, intenta de nuevo.',
    };
  }
}
