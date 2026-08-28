import {
  useEffect,
  useState,
} from "react";

import Modal from "../shared/Modal";
import ProviderIcon from "../shared/ProviderIcon";
import { formatProviderName } from "../../utils/providerName";
import { formatSourceName } from "../../utils/sourceName";
import {
  emitFavouriteChange,
  subscribeToFavouriteChanges,
} from "../../utils/favouritesStore";

import {
  deleteConversation,
  getConversationMessages,
  setConversationFavourite,
  type Conversation,
  type Message,
} from "../../services/api";

interface ConversationDetailsProps {
  conversation: Conversation;
  onClose: () => void;
  onChanged?: () => Promise<void>;
  onDeleted?: () => Promise<void>;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function ConversationDetails({
  conversation,
  onClose,
  onChanged,
  onDeleted,
}: ConversationDetailsProps) {
  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [
    isFavourite,
    setIsFavourite,
  ] = useState(
    conversation.is_favourite,
  );

  const [
    isSavingFavourite,
    setIsSavingFavourite,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    isDeleteHovered,
    setIsDeleteHovered,
  ] = useState(false);

  useEffect(() => {
    setIsFavourite(
      conversation.is_favourite,
    );
  }, [
    conversation.is_favourite,
  ]);

  useEffect(() => {
    return subscribeToFavouriteChanges(
      (change) => {
        if (
          change.conversationId ===
          conversation.id
        ) {
          setIsFavourite(
            change.isFavourite,
          );
        }
      },
    );
  }, [conversation.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setIsLoading(true);

      try {
        const result =
          await getConversationMessages(
            conversation.id,
          );

        if (!cancelled) {
          setMessages(result);
          setError("");
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load messages.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  async function toggleFavourite() {
    if (
      isSavingFavourite ||
      isDeleting
    ) {
      return;
    }

    const nextValue = !isFavourite;

    setIsFavourite(nextValue);
    setIsSavingFavourite(true);

    try {
      await setConversationFavourite(
        conversation.id,
        nextValue,
      );

      emitFavouriteChange({
        conversationId: conversation.id,
        isFavourite: nextValue,
      });

      await onChanged?.();
    } catch (error) {
      setIsFavourite(
        !nextValue,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update favourite.",
      );
    } finally {
      setIsSavingFavourite(false);
    }
  }

  async function handleDelete() {
    if (
      isDeleting ||
      isSavingFavourite
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${conversation.title}"? This will permanently remove the conversation from Replay.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteConversation(
        conversation.id,
      );

      await onDeleted?.();

      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete the conversation.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function openOriginal() {
    if (
      conversation.original_url
    ) {
      window.open(
        conversation.original_url,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  const favouriteButtonStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    minHeight: "40px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    border: "1px solid rgba(199, 162, 82, 0.55)",
    borderRadius: "7px",
    background: "transparent",
    cursor:
      isSavingFavourite ||
      isDeleting
        ? "not-allowed"
        : "pointer",
    opacity:
      isSavingFavourite ||
      isDeleting
        ? 0.55
        : 1,
  };

  const favouriteImageStyle: React.CSSProperties = {
    width: "20px",
    height: "20px",
    minWidth: "20px",
    minHeight: "20px",
    display: "block",
    objectFit: "contain",
  };

  const deleteButtonStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    minHeight: "40px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    border: "1px solid rgba(199, 162, 82, 0.55)",
    borderRadius: "7px",
    background: "transparent",
    cursor:
      isDeleting ||
      isSavingFavourite
        ? "not-allowed"
        : "pointer",
    opacity:
      isDeleting ||
      isSavingFavourite
        ? 0.55
        : 1,
  };

  const deleteImageStyle: React.CSSProperties = {
    width: "20px",
    height: "20px",
    minWidth: "20px",
    minHeight: "20px",
    display: "block",
    objectFit: "contain",
  };

  return (
    <Modal
      onClose={onClose}
      className="conversation-details-modal"
      ariaLabel="Conversation details"
    >
      <div className="conversation-details-header">
        <div className="conversation-details-title">
          <ProviderIcon
            provider={
              conversation.provider
            }
          />

          <div>
            <h2>
              {conversation.title}
            </h2>

            <p>
              {formatProviderName(
                conversation.provider,
              )}
            </p>
          </div>
        </div>

        <div className="conversation-details-controls">
          <button
            type="button"
            className="details-favourite-button"
            style={favouriteButtonStyle}
            onClick={() =>
              void toggleFavourite()
            }
            disabled={
              isSavingFavourite ||
              isDeleting
            }
            aria-label={
              isFavourite
                ? "Remove from favourites"
                : "Add to favourites"
            }
          >
            <img
              src={
                isFavourite
                  ? "/assets/favourite-filled.png"
                  : "/assets/favourite-empty.png"
              }
              alt=""
              aria-hidden="true"
              style={
                favouriteImageStyle
              }
            />
          </button>

          <button
            type="button"
            className="details-delete-button"
            style={deleteButtonStyle}
            onClick={() =>
              void handleDelete()
            }
            onMouseEnter={() =>
              setIsDeleteHovered(true)
            }
            onMouseLeave={() =>
              setIsDeleteHovered(false)
            }
            disabled={
              isDeleting ||
              isSavingFavourite
            }
            aria-label="Delete conversation"
            title="Delete conversation"
          >
            <img
              src={
                isDeleteHovered
                  ? "/assets/delete-hover.png"
                  : "/assets/delete.png"
              }
              alt=""
              aria-hidden="true"
              style={
                deleteImageStyle
              }
            />
          </button>
        </div>
      </div>

      <div className="modal-divider" />

      <div className="conversation-details-meta">
        <div>
          <span>Date</span>

          <strong>
            {formatDate(
              conversation.created_at,
            )}
          </strong>
        </div>

        <div>
          <span>Source</span>

          <strong>
            {formatSourceName(
              conversation.source,
            )}
          </strong>
        </div>

        <div>
          <span>Messages</span>

          <strong>
            {messages.length}
          </strong>
        </div>
      </div>

      <section className="conversation-detail-section">
        <h3>
          Short Description
        </h3>

        <p>
          {conversation.short_description ||
            "No short description is available."}
        </p>
      </section>

      <section className="conversation-detail-section">
        <h3>
          Long Description
        </h3>

        <p>
          {conversation.long_description ||
            "No long description is available."}
        </p>
      </section>

      <section className="conversation-message-section">
        <h3>Messages</h3>

        {isLoading && (
          <p>
            Loading messages...
          </p>
        )}

        {error && (
          <p className="modal-error">
            {error}
          </p>
        )}

        {!isLoading &&
          !error &&
          messages.length === 0 && (
            <p>
              No messages are stored.
            </p>
          )}

        {!isLoading &&
          !error &&
          messages.length > 0 && (
            <div className="message-preview">
              {messages.map(
                (message) => (
                  <article
                    className="message-preview-item"
                    key={message.id}
                  >
                    <span>
                      {message.role}
                    </span>

                    <p>
                      {message.content}
                    </p>
                  </article>
                ),
              )}
            </div>
          )}
      </section>

      <div className="conversation-details-actions">
        <button
          type="button"
          className="modal-secondary-button"
          onClick={openOriginal}
          disabled={
            !conversation.original_url
          }
        >
          <img
            src="/assets/open-original.png"
            alt=""
            aria-hidden="true"
          />

          <span>
            {conversation.original_url
              ? "Open Original Chat"
              : "Original Unavailable"}
          </span>
        </button>
      </div>
    </Modal>
  );
}

export default ConversationDetails;