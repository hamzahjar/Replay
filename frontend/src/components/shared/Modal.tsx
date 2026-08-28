import type { ReactNode } from "react";
import { useEffect, useId } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  ariaLabel: string;
}

/**
 * Tracks which modals are open, in the order they opened.
 * Only the modal on top of the stack reacts to Escape, so
 * closing a nested modal does not also close the one behind
 * it.
 */
const modalStack: string[] = [];

function Modal({
  children,
  onClose,
  className = "",
  ariaLabel,
}: ModalProps) {
  const modalId = useId();

  useEffect(() => {
    modalStack.push(modalId);

    return () => {
      const index =
        modalStack.indexOf(modalId);

      if (index !== -1) {
        modalStack.splice(index, 1);
      }
    };
  }, [modalId]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (
        modalStack[
          modalStack.length - 1
        ] !== modalId
      ) {
        return;
      }

      event.stopPropagation();
      onClose();
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [modalId, onClose]);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          aria-label="Close"
        >
          <img
            src="/assets/close.png"
            alt=""
            aria-hidden="true"
          />
        </button>

        <div className="modal-body">
          {children}
        </div>
      </section>
    </div>
  );
}

export default Modal;
