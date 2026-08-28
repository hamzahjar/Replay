import { useEffect, useState } from "react";

import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";

import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";

import ConversationLibrary from "./components/conversations/ConversationLibrary";
import ConversationDetails from "./components/conversations/ConversationDetails";
import SettingsModal from "./components/settings/SettingsModal";
import ImportModal from "./components/imports/ImportModal";

import {
  getConversations,
  type Conversation,
} from "./services/api";

import { subscribeToFavouriteChanges } from "./utils/favouritesStore";

import "./App.css";

function App() {
  const { user, isLoading } = useAuth();

  const [
    activePage,
    setActivePage,
  ] = useState<
    "dashboard" | "conversations" | "favourites"
  >("dashboard");

  const [
    isConversationLibraryOpen,
    setIsConversationLibraryOpen,
  ] = useState(false);

  const [
    isSettingsOpen,
    setIsSettingsOpen,
  ] = useState(false);

  const [
    isImportOpen,
    setIsImportOpen,
  ] = useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([]);

  const [
    hasLoadedConversations,
    setHasLoadedConversations,
  ] = useState(false);

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState<Conversation | null>(null);

  async function loadConversations() {
    const result = await getConversations();

    setConversations(result);
    setHasLoadedConversations(true);
  }

  useEffect(() => {
    return subscribeToFavouriteChanges(
      (change) => {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id ===
            change.conversationId
              ? {
                  ...conversation,
                  is_favourite:
                    change.isFavourite,
                }
              : conversation,
          ),
        );

        setSelectedConversation(
          (current) =>
            current &&
            current.id ===
              change.conversationId
              ? {
                  ...current,
                  is_favourite:
                    change.isFavourite,
                }
              : current,
        );
      },
    );
  }, []);

  async function openConversationLibrary(
    mode:
      | "all"
      | "favourites" = "all",
  ) {
    await loadConversations();

    setActivePage(
      mode === "favourites"
        ? "favourites"
        : "conversations",
    );

    setIsConversationLibraryOpen(true);
  }

  async function handleImported() {
    await loadConversations();
  }

  function handleConversationSelected(
    conversation: Conversation,
  ) {
    setSelectedConversation(conversation);
  }

  async function handleConversationChanged() {
    await loadConversations();

    if (selectedConversation) {
      const updatedConversation =
        conversations.find(
          (conversation) =>
            conversation.id ===
            selectedConversation.id,
        );

      if (updatedConversation) {
        setSelectedConversation(
          updatedConversation,
        );
      }
    }
  }

  if (isLoading) {
    return (
      <div className="app-loading">
        <p>Loading Replay...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout
      activePage={activePage}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onNavigate={(page) => {
        if (page === "dashboard") {
          setActivePage("dashboard");
          setSearchTerm("");
          setIsConversationLibraryOpen(false);
          return;
        }

        if (page === "conversations") {
          void openConversationLibrary("all");
          return;
        }

        void openConversationLibrary(
          "favourites",
        );
      }}
      onSettings={() =>
        setIsSettingsOpen(true)
      }
    >
      {activePage === "dashboard" && (
        <Dashboard
          searchTerm={searchTerm}
          onImport={() =>
            setIsImportOpen(true)
          }
          onViewConversations={() =>
            void openConversationLibrary("all")
          }
          onConversationSelected={
            handleConversationSelected
          }
          onRefresh={loadConversations}
        />
      )}

      {!hasLoadedConversations &&
        activePage !== "dashboard" && (
          <div className="app-loading">
            <p>
              Loading conversations...
            </p>
          </div>
        )}

      {isConversationLibraryOpen && (
        <ConversationLibrary
          conversations={conversations}
          mode={
            activePage === "favourites"
              ? "favourites"
              : "all"
          }
          onClose={() => {
            setIsConversationLibraryOpen(false);
            setActivePage("dashboard");
          }}
          onRefresh={loadConversations}
          onConversationSelected={
            handleConversationSelected
          }
        />
      )}

      {selectedConversation && (
        <ConversationDetails
          conversation={selectedConversation}
          onClose={() =>
            setSelectedConversation(null)
          }
          onChanged={
            handleConversationChanged
          }
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() =>
            setIsSettingsOpen(false)
          }
        />
      )}

      {isImportOpen && (
        <ImportModal
          onClose={() =>
            setIsImportOpen(false)
          }
          onImported={async () => {
            await handleImported();
            setIsImportOpen(false);
          }}
        />
      )}
    </AppLayout>
  );
}

export default App;