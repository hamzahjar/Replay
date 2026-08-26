interface SidebarProps {
  activePage?:
    | "dashboard"
    | "conversations"
    | "favourites";
  onNavigate?: (
    page:
      | "dashboard"
      | "conversations"
      | "favourites",
  ) => void;
  onSettings?: () => void;
}

function Sidebar({
  activePage = "dashboard",
  onNavigate,
  onSettings,
}: SidebarProps) {
  const dashboardClassName =
    activePage === "dashboard"
      ? "sidebar-nav-item active"
      : "sidebar-nav-item";

  const conversationsClassName =
    activePage === "conversations"
      ? "sidebar-nav-item active"
      : "sidebar-nav-item";

  const favouritesClassName =
    activePage === "favourites"
      ? "sidebar-nav-item active"
      : "sidebar-nav-item";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src="/assets/replay-logo.png"
          alt="Replay"
        />
      </div>

      <nav className="sidebar-navigation">
        <button
          type="button"
          className={dashboardClassName}
          onClick={() => {
            onNavigate?.("dashboard");
          }}
        >
          <img
            src="/assets/dashboard.png"
            alt=""
            aria-hidden="true"
          />

          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={conversationsClassName}
          onClick={() => {
            onNavigate?.("conversations");
          }}
        >
          <img
            src="/assets/conversations.png"
            alt=""
            aria-hidden="true"
          />

          <span>Conversations</span>
        </button>

        <button
          type="button"
          className={favouritesClassName}
          onClick={() => {
            onNavigate?.("favourites");
          }}
        >
          <img
            src="/assets/favourite-filled.png"
            alt=""
            aria-hidden="true"
          />

          <span>Favourites</span>
        </button>

        <div className="sidebar-divider" />

        <button
          type="button"
          className="sidebar-nav-item"
          onClick={() => {
            onSettings?.();
          }}
        >
          <img
            src="/assets/settings.png"
            alt=""
            aria-hidden="true"
          />

          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;