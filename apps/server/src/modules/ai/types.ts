// apps/server/src/modules/ai/types.ts
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  conversationId: number;
  content: string;
}
