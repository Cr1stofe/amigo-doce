export type Participant = { id: string; name: string; linkToken: string | null; revealedAt: string | null };
export type Event = { id: string; title: string; dateTime: string | null; location: string | null; message: string | null; drawnAt: string | null; participants: Participant[] };
export type Reveal = { event: Pick<Event, 'title' | 'dateTime' | 'location' | 'message'>; participant: { name: string }; revealed: boolean; match?: { name: string } };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message;
    throw new Error(Array.isArray(message) ? message.join(', ') : message || 'Não foi possível concluir a operação.');
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}
