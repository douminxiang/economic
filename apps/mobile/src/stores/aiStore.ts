import { create } from 'zustand';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinkingContent?: string;
  imageUrl?: string;
  searchResults?: SearchResult[];
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
  addUserMessage: (content: string, imageUrl?: string) => void;
  addAssistantMessage: (content: string) => void;
  updateLastAssistantMessage: (content: string) => void;
  updateLastAssistantThinking: (thinkingChunk: string) => void;
  setStreaming: (streaming: boolean) => void;
  setSearchResults: (results: SearchResult[]) => void;
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

  addUserMessage: (content, imageUrl) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `user-${Date.now()}`, role: 'user', content, imageUrl },
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

  updateLastAssistantThinking: (thinkingChunk) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = {
          ...lastMsg,
          thinkingContent: (lastMsg.thinkingContent || '') + thinkingChunk,
        };
      }
      return { messages };
    }),

  setSearchResults: (results) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        messages[messages.length - 1] = { ...lastMsg, searchResults: results };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [], currentConversationId: null }),
}));
