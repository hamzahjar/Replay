import {
  useMemo,
  useState,
} from "react";

import Modal from "../shared/Modal";
import ConversationCard from "../dashboard/ConversationCard";
import ConversationDetails from "./ConversationDetails";

import type { Conversation } from "../../services/api";

interface ConversationLibraryProps {
  conversations: Conversation[];
  mode?: "all" | "favourites";
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onConversationSelected?: (
    conversation: Conversation,
  ) => void;
}

function ConversationLibrary({
  conversations,
  mode = "all",
  onClose,
  onRefresh,
  onConversationSelected,
}: ConversationLibraryProps) {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState<Conversation | null>(
    null,
  );

  const displayedConversations =
    useMemo(() => {
      if (mode === "favourites") {
        return conversations.filter(
          (conversation) =>
            conversation.is_favourite,
        );
      }

      return conversations;
    }, [conversations, mode]);

  const filteredConversations =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return displayedConversations;
      }

      return displayedConversations.filter(
        (conversation) =>
          conversation.title
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          conversation.provider
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          (
            conversation.short_description ??
            ""
          )
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
      );
    }, [
      displayedConversations,
      searchTerm,
    ]);

  const pageTitle =
    mode === "favourites"
      ? "Favourites"
      : "Conversations";

  const emptyTitle =
    mode === "favourites"
      ? "No favourite conversations yet."
      : conversations.length === 0
        ? "No conversations imported yet."
        : "No conversations found.";

  const emptyDescription =
    mode === "favourites"
      ? "Favourite conversations will appear here."
      : conversations.length === 0
        ? "Import your ChatGPT history to get started."
        : "Try a different search.";

  async function handleConversationDeleted() {
    if (selectedConversation) {
      setSelectedConversation(null);
    }

    await onRefresh();
  }

  return (
    <>
      <Modal
        onClose={onClose}
        className="conversation-library-modal"
        ariaLabel={
          mode === "favourites"
            ? "Favourite conversations"
            : "Conversation library"
        }
      >
        <div className="library-header">
          <div>
            <h2>{pageTitle}</h2>

            <p>
              {
                displayedConversations.length
              }{" "}
              {
                displayedConversations.length ===
                1
                  ? "conversation"
                  : "conversations"
              }
            </p>
          </div>

          <div className="library-search">
            <img
              src="/assets/search.png"
              alt=""
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Search conversations..."
              aria-label="Search conversations"
            />
          </div>
        </div>

        <div className="modal-divider" />

        {filteredConversations.length ===
        0 ? (
          <div className="library-empty">
            <h3>{emptyTitle}</h3>

            <p>
              {emptyDescription}
            </p>
          </div>
        ) : (
          <div className="library-grid">
            {filteredConversations.map(
              (conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isFavourite={
                    conversation.is_favourite
                  }
                  onFavouriteChange={
                    onRefresh
                  }
                  onDeleted={
                    onRefresh
                  }
                  onOpen={() => {
                    if (
                      onConversationSelected
                    ) {
                      onConversationSelected(
                        conversation,
                      );
                      return;
                    }

                    setSelectedConversation(
                      conversation,
                    );
                  }}
                />
              ),
            )}
          </div>
        )}
      </Modal>

      {selectedConversation && (
        <ConversationDetails
          conversation={
            selectedConversation
          }
          onClose={() =>
            setSelectedConversation(
              null,
            )
          }
          onChanged={onRefresh}
          onDeleted={
            handleConversationDeleted
          }
        />
      )}
    </>
  );
}

export default ConversationLibrary;