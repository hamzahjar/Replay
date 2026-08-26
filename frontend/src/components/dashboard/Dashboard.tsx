import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";

import {
  getConversationMessages,
  getConversations,
  type Conversation,
} from "../../services/api";

import ConversationCard from "./ConversationCard";
import ConversationStats from "./ConversationStats";
import ActivityOverview from "./ActivityOverview";

interface DashboardProps {
  onViewConversations?: () => void;
  onImport?: () => void;
  searchTerm?: string;
  onConversationSelected?: (
    conversation: Conversation,
  ) => void;
  onRefresh?: () => Promise<void>;
}

function Dashboard({
  onViewConversations,
  onImport,
  searchTerm = "",
  onConversationSelected,
  onRefresh,
}: DashboardProps) {
  const { user } = useAuth();

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([]);

  const [messageCount, setMessageCount] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  async function loadConversations() {
    setIsLoading(true);
    setError("");

    try {
      const result = await getConversations();

      setConversations(result);

      const messageResults =
        await Promise.all(
          result.map((conversation) =>
            getConversationMessages(
              conversation.id,
            ),
          ),
        );

      setMessageCount(
        messageResults.reduce(
          (total, messages) =>
            total + messages.length,
          0,
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load conversations.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return conversations;
    }

    return conversations.filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        conversation.provider
          .toLowerCase()
          .includes(normalizedSearch) ||
        (
          conversation.short_description ??
          ""
        )
          .toLowerCase()
          .includes(normalizedSearch),
    );
  }, [conversations, searchTerm]);

  const recentConversations =
    filteredConversations.slice(0, 6);

  async function handleFavouriteChange() {
    await loadConversations();
    await onRefresh?.();
  }

  async function handleConversationDeleted() {
    await loadConversations();
    await onRefresh?.();
  }

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h1>
            Welcome back,{" "}
            {user?.display_name ?? "there"}.
          </h1>

          <p>
            Here's what's been happening with
            your conversations.
          </p>
        </div>

        <button
          type="button"
          className="import-conversations-button"
          onClick={onImport}
        >
          <img
            src="/assets/upload.png"
            alt=""
            aria-hidden="true"
          />

          <span>
            Import Conversations
          </span>
        </button>
      </div>

      <div className="section-heading">
        <h2>Recent Conversations</h2>

        <button
          type="button"
          className="view-all-button"
          onClick={onViewConversations}
        >
          View all conversations
          <span aria-hidden="true">
            →
          </span>
        </button>
      </div>

      {isLoading && (
        <div className="dashboard-state">
          <p>
            Loading conversations...
          </p>
        </div>
      )}

      {error && (
        <div className="dashboard-state dashboard-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              void loadConversations()
            }
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading &&
        !error &&
        conversations.length === 0 && (
          <div className="dashboard-empty">
            <h3>
              No conversations imported yet.
            </h3>

            <p>
              Import your ChatGPT history to
              get started.
            </p>
          </div>
        )}

      {!isLoading &&
        !error &&
        conversations.length > 0 &&
        recentConversations.length === 0 && (
          <div className="dashboard-empty">
            <h3>
              No conversations found.
            </h3>

            <p>
              Try changing your search.
            </p>
          </div>
        )}

      {!isLoading &&
        !error &&
        recentConversations.length > 0 && (
          <section className="conversation-grid">
            {recentConversations.map(
              (conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isFavourite={
                    conversation.is_favourite
                  }
                  onFavouriteChange={
                    handleFavouriteChange
                  }
                  onDeleted={
                    handleConversationDeleted
                  }
                  onOpen={() =>
                    onConversationSelected?.(
                      conversation,
                    )
                  }
                />
              ),
            )}
          </section>
        )}

      <section className="dashboard-bottom">
        <ConversationStats
          conversationCount={
            conversations.length
          }
          messageCount={messageCount}
        />

        <ActivityOverview
          conversations={conversations}
        />
      </section>
    </div>
  );
}

export default Dashboard;