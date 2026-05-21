import { api } from './api.client';
import type { ChatSession, ChatMessage, CreateSessionInput, SendMessageInput } from '@archon/shared';

export const chatApi = {
  createSession: (input: CreateSessionInput)    => api.post<ChatSession>('/chat/session', input),
  getSession:    (id: string)                   => api.get<ChatSession>(`/chat/session/${id}`),
  getHistory:    (sessionId: string)            => api.get<ChatMessage[]>(`/chat/history/${sessionId}`),
  sendMessage:   (input: SendMessageInput)      => api.post<{ messageId: string }>('/chat/message', input),
};
