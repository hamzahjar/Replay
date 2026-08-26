import type {
  CurrentConversation,
  ExtensionAuthState,
  LocalConversation,
  SavedConversation
} from "./types";

import {
  clearAuthState,
  getAuthState,
  setAuthState,
  updateLocalConversation
} from "./storage";

const DEFAULT_WEBSITE_URL = "http://localhost:5173";
const DEFAULT_API_URL = "http://localhost:8000";

async function getConfig() {
  const result = await chrome.storage.local.get([
    "replayApiBaseUrl",
    "replayWebsiteUrl"
  ]);

  return {
    apiBaseUrl:
      typeof result.replayApiBaseUrl === "string"
        ? result.replayApiBaseUrl
        : DEFAULT_API_URL,

    websiteUrl:
      typeof result.replayWebsiteUrl === "string"
        ? result.replayWebsiteUrl
        : DEFAULT_WEBSITE_URL
  };
}

async function parseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as {
      detail?: string;
      message?: string;
    };

    return body.detail ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function login(
  email: string,
  password: string
): Promise<ExtensionAuthState> {
  const config = await getConfig();

  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, "")}/auth/extension-login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      await parseError(
        response,
        `Login failed (${response.status}).`
      )
    );
  }

  const body = await response.json() as {
    access_token: string;
    token_type: string;
    user: {
      id: number;
      display_name: string;
      email: string;
    };
  };

  const auth: ExtensionAuthState = {
    accessToken: body.access_token,

    user: {
      id: body.user.id,
      displayName: body.user.display_name,
      email: body.user.email
    }
  };

  await setAuthState(auth);

  return auth;
}

export async function register(
  displayName: string,
  email: string,
  password: string
): Promise<ExtensionAuthState> {
  const config = await getConfig();

  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, "")}/auth/extension-register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        display_name: displayName,
        email,
        password
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      await parseError(
        response,
        `Account creation failed (${response.status}).`
      )
    );
  }

  const body = await response.json() as {
    access_token: string;
    token_type: string;
    user: {
      id: number;
      display_name: string;
      email: string;
    };
  };

  const auth: ExtensionAuthState = {
    accessToken: body.access_token,

    user: {
      id: body.user.id,
      displayName: body.user.display_name,
      email: body.user.email
    }
  };

  await setAuthState(auth);

  return auth;
}

export async function logout() {
  await clearAuthState();
}

export async function openReplayWebsite() {
  const config = await getConfig();

  await chrome.tabs.create({
    url: config.websiteUrl
  });
}

export async function saveConversation(
  conversation: LocalConversation
): Promise<SavedConversation> {
  const auth = await getAuthState();

  if (!auth.accessToken) {
    throw new Error("REPLAY_AUTH_REQUIRED");
  }

  const config = await getConfig();

  await updateLocalConversation(
    conversation.localId,
    {
      syncStatus: "saving"
    }
  );

  try {
    const response = await fetch(
      `${config.apiBaseUrl.replace(/\/$/, "")}/conversations/sync`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`
        },

        body: JSON.stringify({
          provider: conversation.provider,

          provider_conversation_id:
            conversation.providerConversationId,

          title: conversation.title,

          original_url: conversation.url,

          messages: conversation.messages.map(
            (message, index) => ({
              role: message.role,
              content: message.content,
              sequence_number: index,
              created_at: message.createdAt ?? null
            })
          )
        })
      }
    );

    if (response.status === 401) {
      await clearAuthState();

      await updateLocalConversation(
        conversation.localId,
        {
          syncStatus: "local"
        }
      );

      throw new Error("REPLAY_AUTH_EXPIRED");
    }

    if (!response.ok) {
      throw new Error(
        await parseError(
          response,
          `Replay API request failed (${response.status}).`
        )
      );
    }

    const saved =
      await response.json() as SavedConversation;

    await updateLocalConversation(
      conversation.localId,
      {
        syncStatus: "saved",
        replayId: saved.id,
        title: saved.title || conversation.title,
        shortDescription:
          saved.short_description ??
          conversation.shortDescription,

        longDescription:
          saved.long_description ??
          conversation.longDescription
      }
    );

    return saved;
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message === "REPLAY_AUTH_EXPIRED" ||
        error.message === "REPLAY_AUTH_REQUIRED"
      )
    ) {
      throw error;
    }

    await updateLocalConversation(
      conversation.localId,
      {
        syncStatus: "error"
      }
    );

    throw error;
  }
}

export async function generatePreviewMetadata(
  conversation: CurrentConversation
): Promise<{
  title: string;
  short_description: string;
  long_description: string;
}> {
  const auth = await getAuthState();

  if (!auth.accessToken) {
    throw new Error("REPLAY_AUTH_REQUIRED");
  }

  const config = await getConfig();

  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, "")}/conversations/preview-metadata`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`
      },

      body: JSON.stringify({
        messages: conversation.messages.map(
          (message, index) => ({
            role: message.role,
            content: message.content,
            sequence_number: index,
            created_at: message.createdAt ?? null
          })
        )
      })
    }
  );

  if (response.status === 401) {
    await clearAuthState();

    throw new Error("REPLAY_AUTH_EXPIRED");
  }

  if (!response.ok) {
    throw new Error(
      await parseError(
        response,
        `AI metadata request failed (${response.status}).`
      )
    );
  }

  return response.json();
}