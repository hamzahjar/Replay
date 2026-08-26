export type Provider = "chatgpt";
export type MessageRole = "user" | "assistant" | "system" | "unknown";
export type SyncStatus = "local" | "saving" | "saved" | "error";

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  createdAt?: string;
}

export interface CurrentConversation {
  provider: Provider;
  providerConversationId: string | null;
  title: string;
  shortDescription: string;
  longDescription: string;
  url: string;
  messages: ConversationMessage[];
  detectedAt: string;
}

export interface LocalConversation extends CurrentConversation {
  localId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  syncStatus: SyncStatus;
  replayId?: number | string;
}

export interface SavedConversation {
  id: number | string;
  provider: Provider;
  providerConversationId: string | null;
  title: string;
  short_description?: string | null;
  long_description?: string | null;
  original_url?: string | null;
}

export interface ExtensionAuthState {
  accessToken: string | null;
  user: {
    id: number | string;
    displayName?: string | null;
    email?: string | null;
  } | null;
}