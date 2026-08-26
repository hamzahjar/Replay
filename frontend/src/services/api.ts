const API_BASE_URL = "http://localhost:8000";

export interface CurrentUser {
  id: number;
  display_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  provider: string;
  provider_conversation_id: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  original_url: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  last_synchronized_at: string | null;
  is_favourite: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  sequence_number: number;
  created_at: string | null;
}

export interface ImportJob {
  id: number;
  user_id: number;
  provider: string;
  source: string;
  status: string;
  filename: string | null;
  total_conversations: number;
  processed_conversations: number;
  failed_conversations: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

function getAccessToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("replay_access_token") ||
    localStorage.getItem("token")
  );
}

function getErrorMessage(
  errorData: unknown,
  fallback: string,
): string {
  if (!errorData) {
    return fallback;
  }

  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "detail" in errorData
  ) {
    const detail = (
      errorData as {
        detail?: unknown;
      }
    ).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (
            typeof item === "object" &&
            item !== null
          ) {
            if (
              "msg" in item &&
              typeof item.msg === "string"
            ) {
              return item.msg;
            }

            return JSON.stringify(item);
          }

          return String(item);
        })
        .join(". ");
    }

    if (
      typeof detail === "object" &&
      detail !== null
    ) {
      if (
        "message" in detail &&
        typeof detail.message === "string"
      ) {
        return detail.message;
      }

      return JSON.stringify(detail);
    }

    return String(detail);
  }

  if (typeof errorData === "string") {
    return errorData;
  }

  return fallback;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData =
    options.body instanceof FormData;

  const accessToken = getAccessToken();

  const headers = new Headers(
    options.headers,
  );

  if (!isFormData) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (accessToken) {
    headers.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers,
    },
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      getErrorMessage(
        errorData,
        `Request failed with status ${response.status}.`,
      ),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response =
    await apiRequest<LoginResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
    );

  localStorage.setItem(
    "access_token",
    response.access_token,
  );

  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>(
      "/auth/logout",
      {
        method: "POST",
      },
    );
  } finally {
    localStorage.removeItem(
      "access_token",
    );
    localStorage.removeItem(
      "replay_access_token",
    );
    localStorage.removeItem("token");
  }
}

export async function register(
  displayName: string,
  email: string,
  password: string,
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        display_name: displayName,
        email,
        password,
      }),
    },
  );
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>(
    "/auth/me",
  );
}

export async function getConversations(): Promise<
  Conversation[]
> {
  return apiRequest<Conversation[]>(
    "/conversations",
  );
}

export async function getConversation(
  conversationId: number,
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/conversations/${conversationId}`,
  );
}

export async function getConversationMessages(
  conversationId: number,
): Promise<Message[]> {
  return apiRequest<Message[]>(
    `/conversations/${conversationId}/messages`,
  );
}

export async function setConversationFavourite(
  conversationId: number,
  isFavourite: boolean,
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/conversations/${conversationId}/favourite`,
    {
      method: "PATCH",
      body: JSON.stringify({
        is_favourite: isFavourite,
      }),
    },
  );
}

export async function deleteConversation(
  conversationId: number,
): Promise<void> {
  await apiRequest<void>(
    `/conversations/${conversationId}`,
    {
      method: "DELETE",
    },
  );
}

export async function importChatGPTExport(
  file: File,
): Promise<ImportJob> {
  const formData = new FormData();

  formData.append("file", file);

  return apiRequest<ImportJob>(
    "/imports?provider=chatgpt&source=export",
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function getImportJob(
  importJobId: number,
): Promise<ImportJob> {
  return apiRequest<ImportJob>(
    `/imports/${importJobId}`,
  );
}
