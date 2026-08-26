import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ProviderIcon from "../shared/ProviderIcon";

import {
  deleteConversation,
  setConversationFavourite,
  type Conversation,
} from "../../services/api";

interface ConversationCardProps {
  conversation: Conversation;
  onOpen: () => void;
  isFavourite?: boolean;
  onFavouriteChange?: () => Promise<void>;
  onDeleted?: () => Promise<void>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(new Date(value));
}

function ConversationCard({
  conversation,
  onOpen,
  isFavourite = false,
  onFavouriteChange,
  onDeleted,
}: ConversationCardProps) {
  const [
    localIsFavourite,
    setLocalIsFavourite,
  ] = useState(isFavourite);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    isDeleteHovered,
    setIsDeleteHovered,
  ] = useState(false);

  useEffect(() => {
    setLocalIsFavourite(isFavourite);
  }, [isFavourite]);

  const date = useMemo(
    () =>
      formatDate(
        conversation.created_at,
      ),
    [conversation.created_at],
  );

  async function handleFavouriteClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    if (isSaving || isDeleting) {
      return;
    }

    const nextValue =
      !localIsFavourite;

    setLocalIsFavourite(nextValue);
    setIsSaving(true);

    try {
      await setConversationFavourite(
        conversation.id,
        nextValue,
      );

      await onFavouriteChange?.();
    } catch (error) {
      setLocalIsFavourite(
        !nextValue,
      );

      console.error(
        "Unable to update favourite:",
        error,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    if (isSaving || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${conversation.title}"? This will permanently remove the conversation from Replay.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteConversation(
        conversation.id,
      );

      await onDeleted?.();
    } catch (error) {
      console.error(
        "Unable to delete conversation:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete the conversation.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article
      className="conversation-card"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="conversation-card-header">
        <ProviderIcon
          provider={conversation.provider}
        />

        <div className="conversation-title-container">
          <h3>{conversation.title}</h3>

          <p className="conversation-provider">
            {conversation.provider}
          </p>
        </div>
      </div>

      <p className="conversation-description">
        {conversation.short_description ||
          "No description is available."}
      </p>

      <div className="conversation-card-footer">
        <span>{date}</span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <button
            type="button"
            className="bookmark-button"
            onClick={
              handleFavouriteClick
            }
            disabled={
              isSaving || isDeleting
            }
            aria-label={
              localIsFavourite
                ? "Remove from favourites"
                : "Add to favourites"
            }
          >
            <img
              src={
                localIsFavourite
                  ? "/assets/favourite-filled.png"
                  : "/assets/favourite-empty.png"
              }
              alt=""
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className="bookmark-button"
            onClick={
              handleDeleteClick
            }
            onMouseEnter={() =>
              setIsDeleteHovered(true)
            }
            onMouseLeave={() =>
              setIsDeleteHovered(false)
            }
            disabled={
              isSaving || isDeleting
            }
            aria-label="Delete conversation"
            title="Delete conversation"
            style={{
              opacity: isDeleting
                ? 0.55
                : 1,
              cursor: isDeleting
                ? "not-allowed"
                : "pointer",
            }}
          >
            <img
              src={
                isDeleteHovered
                  ? "/assets/delete-hover.png"
                  : "/assets/delete.png"
              }
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  );
}

export default ConversationCard;