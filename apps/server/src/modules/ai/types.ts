// apps/server/src/modules/ai/types.ts
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AIResponse {
  conversationId: number;
  content: string;
}
