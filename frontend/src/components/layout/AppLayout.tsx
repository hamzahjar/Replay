import type { ReactNode } from "react";

import Sidebar from "./SideBar";
import TopBar from "./TopBar";

interface AppLayoutProps {
  children: ReactNode;

  activePage?:
    | "dashboard"
    | "conversations"
    | "favourites";

  searchTerm: string;

  onSearchChange: (
    value: string,
  ) => void;

  onNavigate?: (
    page:
      | "dashboard"
      | "conversations"
      | "favourites",
  ) => void;

  onSettings?: () => void;
}

function AppLayout({
  children,
  activePage = "dashboard",
  searchTerm,
  onSearchChange,
  onNavigate,
  onSettings,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onSettings={onSettings}
      />

      <div className="app-main">
        <TopBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />

        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;