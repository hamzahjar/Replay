import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  ariaLabel: string;
}

function Modal({
  children,
  onClose,
  className = "",
  ariaLabel,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
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

        {children}
      </section>
    </div>
  );
}

export default Modal;