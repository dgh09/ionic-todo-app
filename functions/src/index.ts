import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const groqApiKey = defineSecret('GROQ_API_KEY');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface Category {
  id: string;
  name: string;
}

function buildSystemPrompt(categories: Category[]): string {
  const categoryList = categories.length
    ? categories.map(c => `- ${c.name} (id: "${c.id}")`).join('\n')
    : '(sin categorías)';

  return `Eres un asistente inteligente para una app de lista de tareas. Respondes siempre en español, de forma breve y amigable.

INSTRUCCIÓN CRÍTICA: responde ÚNICAMENTE con un objeto JSON válido. Sin markdown, sin bloques de código, sin texto antes o después del JSON.

## Esquema de respuesta

Cuando el usuario quiere crear una tarea:
{"action":"create_task","title":"...","description":null,"categoryId":null,"priority":"medium","price":null,"message":"..."}

Cuando solo quiere conversar o hacer una pregunta:
{"action":"chat","message":"..."}

## Reglas de los campos
- title: texto claro y conciso, capitalizado. Ej: "Comprar 3 kg de papas"
- description: detalle adicional si el usuario lo menciona, si no null
- categoryId: id exacto de la lista de categorías o null si no aplica
- priority: "high" si es urgente, "low" si no tiene prisa, "medium" en cualquier otro caso
- price: número sin símbolo de moneda si el usuario menciona un valor, si no null
- message: confirmación o respuesta amigable, máximo 2 oraciones

## Categorías disponibles
${categoryList}

## Ejemplos

Usuario: "necesito comprar leche y pan"
{"action":"create_task","title":"Comprar leche y pan","description":null,"categoryId":"shopping","priority":"medium","price":null,"message":"Listo, agregué 'Comprar leche y pan' a tu lista de compras 🛒"}

Usuario: "llama al médico mañana es urgente"
{"action":"create_task","title":"Llamar al médico","description":"Urgente para mañana","categoryId":null,"priority":"high","price":null,"message":"Anotado como urgente. Recuerda llamar al médico mañana."}

Usuario: "tengo que pagar el arriendo, son 800000 pesos"
{"action":"create_task","title":"Pagar arriendo","description":null,"categoryId":null,"priority":"high","price":800000,"message":"Tarea creada: 'Pagar arriendo' por $800,000."}

Usuario: "hola, cómo funciona esto?"
{"action":"chat","message":"Hola! Puedo ayudarte a agregar tareas con lenguaje natural. Por ejemplo: 'Comprar pan' o 'Llamar al médico mañana, es urgente'."}

Usuario: "agrega comprar 2 kg de papas para el mercado del sábado"
{"action":"create_task","title":"Comprar 2 kg de papas","description":"Para el mercado del sábado","categoryId":"shopping","priority":"low","price":null,"message":"Agregado a compras: '2 kg de papas' para el sábado."}`;
}

export const chatWithGroq = onCall(
  { secrets: [groqApiKey], region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión para usar el asistente.');
    }

    const { history, userMessage, categories } = request.data as {
      history: ChatMessage[];
      userMessage: string;
      categories: Category[];
    };

    if (!userMessage?.trim()) {
      throw new HttpsError('invalid-argument', 'El mensaje no puede estar vacío.');
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(categories ?? []) },
      ...(history ?? []).map((m: ChatMessage) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey.value()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new HttpsError('internal', (err as any)?.error?.message ?? `Groq error ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return { raw: data.choices?.[0]?.message?.content ?? '{}' };
  }
);
