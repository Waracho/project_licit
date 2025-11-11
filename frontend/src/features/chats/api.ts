// src/features/chat/api.ts
export type Chat = {
  id: string;
  tenderRequestId?: string | null;
  bidderUserId: string;
  workerUserId: string;
  status: "OPEN" | "CLOSED";
  unreadBidder: number;
  unreadWorker: number;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderUserId: string;
  text: string;
  createdAt: string; // ISO
};

const API = import.meta.env.VITE_API || "http://localhost:8000";

export async function startChat(bidderUserId: string, tenderRequestId?: string) {
  const res = await fetch(`${API}/chats/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bidderUserId, tenderRequestId }), // sin workerUserId => aleatorio
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Chat>;
}

export async function startChatWith(bidderUserId: string, workerUserId: string, tenderRequestId?: string) {
  const res = await fetch(`${API}/chats/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bidderUserId, workerUserId, tenderRequestId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Chat>;
}

export async function listUsersByRoleKey(key: "BIDDER" | "WORKER", q?: string) {
  const url = new URL(`${API}/users/by_role_key`);
  url.searchParams.set("key", key);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string; userName: string; mail: string }[]>;
}

export async function listMyChats(userId: string) {
  const res = await fetch(`${API}/chats/mine?userId=${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Chat[]>;
}

export async function listMessages(chatId: string, after?: string) {
  const url = new URL(`${API}/chats/${chatId}/messages`);
  if (after) url.searchParams.set("after", after);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ChatMessage[]>;
}

export async function sendMessage(chatId: string, senderUserId: string, text: string) {
  const res = await fetch(`${API}/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderUserId, text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ChatMessage>;
}

export async function markRead(chatId: string, userId: string) {
  const res = await fetch(`${API}/chats/${chatId}/read?userId=${userId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function unreadCount(userId: string) {
  const res = await fetch(`${API}/chats/unread_count?userId=${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ total: number }>;
}


