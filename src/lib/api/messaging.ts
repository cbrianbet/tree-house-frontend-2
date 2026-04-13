import api from "./client";
import type {
  Conversation,
  ConversationCreateRequest,
  Message,
} from "@/types/api";

export async function listConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>("/api/messaging/conversations/");
  return res.data;
}

export async function getConversation(id: number): Promise<Conversation> {
  const res = await api.get<Conversation>(
    `/api/messaging/conversations/${id}/`,
  );
  return res.data;
}

export async function createConversation(
  data: ConversationCreateRequest,
): Promise<Conversation> {
  const res = await api.post<Conversation>(
    "/api/messaging/conversations/",
    data,
  );
  return res.data;
}

export async function listMessages(conversationId: number): Promise<Message[]> {
  const res = await api.get<Message[]>(
    `/api/messaging/conversations/${conversationId}/messages/`,
  );
  return res.data;
}

export async function sendMessage(
  conversationId: number,
  body: string,
): Promise<Message> {
  const res = await api.post<Message>(
    `/api/messaging/conversations/${conversationId}/messages/`,
    { body },
  );
  return res.data;
}

export async function markConversationRead(
  conversationId: number,
): Promise<void> {
  await api.post(`/api/messaging/conversations/${conversationId}/read/`);
}
