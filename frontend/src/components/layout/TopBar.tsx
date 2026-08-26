import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";
import ProfileModal from "../account/ProfileModal";
import NotificationsPanel from "../shared/NotificationsPanel";

interface TopBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
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
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function TopBar({
  searchTerm,
  onSearchChange,
}: TopBarProps) {
  const { user, signOut } = useAuth();

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const [
    isProfileModalOpen,
    setIsProfileModalOpen,
  ] = useState(false);

  const [
    isNotificationsOpen,
    setIsNotificationsOpen,
  ] = useState(false);

  const [
    isNotificationHovered,
    setIsNotificationHovered,
  ] = useState(false);

  const profileRef =
    useRef<HTMLDivElement>(null);

  /*
   * Allows the Settings popup to open
   * the exact same ProfileModal used by
   * the profile dropdown.
   */
  useEffect(() => {
    function handleOpenAccount() {
      setIsProfileOpen(false);
      setIsProfileModalOpen(true);
    }

    window.addEventListener(
      "replay-open-account",
      handleOpenAccount,
    );

    return () => {
      window.removeEventListener(
        "replay-open-account",
        handleOpenAccount,
      );
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  if (!user) {
    return null;
  }

  const initials = getInitials(
    user.display_name,
  );

  async function handleSignOut() {
    await signOut();
  }

  function handleViewProfile() {
    setIsProfileOpen(false);
    setIsProfileModalOpen(true);
  }

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-search">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              onSearchChange(
                event.target.value,
              )
            }
            placeholder="Search conversations..."
            aria-label="Search conversations"
          />

          <img
            className="search-icon"
            src="/assets/search.png"
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="top-bar-actions">
          <div className="notification-container">
            <button
              type="button"
              className="notification-button"
              aria-label="Notifications"
              aria-expanded={
                isNotificationsOpen
              }
              onClick={() =>
                setIsNotificationsOpen(
                  (current) => !current,
                )
              }
              onMouseEnter={() =>
                setIsNotificationHovered(true)
              }
              onMouseLeave={() =>
                setIsNotificationHovered(false)
              }
            >
              <img
                src={
                  isNotificationHovered ||
                  isNotificationsOpen
                    ? "/assets/notifications-hover.png"
                    : "/assets/notifications.png"
                }
                alt=""
                aria-hidden="true"
              />
            </button>

            {isNotificationsOpen && (
              <NotificationsPanel
                onClose={() =>
                  setIsNotificationsOpen(
                    false,
                  )
                }
              />
            )}
          </div>

          <div
            className="profile-container"
            ref={profileRef}
          >
            <button
              type="button"
              className="profile-button"
              onClick={() =>
                setIsProfileOpen(
                  (current) => !current,
                )
              }
              aria-label="Open profile menu"
              aria-expanded={isProfileOpen}
            >
              {initials}
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    {initials}
                  </div>

                  <div className="profile-dropdown-user">
                    <strong>
                      {user.display_name}
                    </strong>

                    <button
                      type="button"
                      className="profile-view-button"
                      onClick={
                        handleViewProfile
                      }
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-logout-button"
                  onClick={handleSignOut}
                >
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isProfileModalOpen && (
        <ProfileModal
          user={user}
          onClose={() =>
            setIsProfileModalOpen(false)
          }
        />
      )}
    </>
  );
}

export default TopBar;