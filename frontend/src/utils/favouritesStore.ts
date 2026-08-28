export interface FavouriteChange {
  conversationId: number;
  isFavourite: boolean;
}

type Listener = (
  change: FavouriteChange,
) => void;

const listeners = new Set<Listener>();

/**
 * Announce that a conversation's favourite state changed.
 * Every subscribed view updates, no matter where the change
 * was made.
 */
export function emitFavouriteChange(
  change: FavouriteChange,
): void {
  for (const listener of [...listeners]) {
    try {
      listener(change);
    } catch (error) {
      console.error(
        "Favourite listener failed:",
        error,
      );
    }
  }
}

/**
 * Subscribe to favourite changes. Returns an unsubscribe
 * function suitable for a useEffect cleanup.
 */
export function subscribeToFavouriteChanges(
  listener: Listener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
