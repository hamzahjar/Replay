import type { CurrentUser } from "../../services/api";
import Modal from "../shared/Modal";

interface ProfileModalProps {
  user: CurrentUser;
  onClose: () => void;
}

function getInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function ProfileModal({
  user,
  onClose,
}: ProfileModalProps) {
  const initials = getInitials(user.display_name);

  return (
    <Modal
      onClose={onClose}
      className="profile-modal"
      ariaLabel="User profile"
    >
      <div className="profile-modal-header">
        <div className="profile-modal-avatar">
          {initials}
        </div>

        <div>
          <h2>{user.display_name}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="modal-divider" />

      <section className="profile-information">
        <h3>Account Information</h3>

        <div className="profile-information-grid">
          <div>
            <span>Name</span>
            <strong>{user.display_name}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div>
            <span>Member since</span>
            <strong>
              {formatDate(user.created_at)}
            </strong>
          </div>

          <div>
            <span>Last updated</span>
            <strong>
              {formatDate(user.updated_at)}
            </strong>
          </div>
        </div>
      </section>
    </Modal>
  );
}

export default ProfileModal;
