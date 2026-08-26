interface NotificationsPanelProps {
  onClose: () => void;
}

function NotificationsPanel({
  onClose,
}: NotificationsPanelProps) {
  return (
    <div
      className="notifications-panel"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="notifications-header">
        <h2>Notifications</h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
        >
          <img
            src="/assets/close.png"
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="notifications-empty">
        <p>No new notifications.</p>
      </div>
    </div>
  );
}

export default NotificationsPanel;
