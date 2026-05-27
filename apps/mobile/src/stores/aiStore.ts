import { create } from 'zustand';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface AIState {
  conversations: any[];
  currentConversationId: number | null;
  messages: AIMessage[];
  isStreaming: boolean;
  setConversations: (conversations: any[]) => void;
  setCurrentConversation: (id: number | null) => void;
  setMessages: (messages: AIMessage[]) => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `user-${Date.now()}`, role: 'user', content },
      ],
    })),

  addAssistantMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `assistant-${Date.now()}`, role: 'assistant', content },
      ],
    })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = { ...lastMsg, content };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));
