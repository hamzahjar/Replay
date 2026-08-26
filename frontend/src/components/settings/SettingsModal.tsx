import DataPrivacyModal from "./DataPrivacyModal";
import { useState } from "react";

import Modal from "../shared/Modal";

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModal({
  onClose,
}: SettingsModalProps) {
  const [
    isDataPrivacyOpen,
    setIsDataPrivacyOpen,
  ] = useState(false);

  function handleAccountClick() {
    window.dispatchEvent(
      new Event("replay-open-account"),
    );

    onClose();
  }

  function handleDataPrivacyClick() {
    setIsDataPrivacyOpen(true);
  }

  return (
    <>
      <Modal
        onClose={onClose}
        className="settings-modal"
        ariaLabel="Replay settings"
      >
        <div className="modal-heading">
          <h2>Settings</h2>

          <p>
            Manage your Replay application
            preferences.
          </p>
        </div>

        <div className="modal-divider" />

        <div className="settings-sections">
          <button
            type="button"
            className="settings-section settings-clickable"
            onClick={handleAccountClick}
          >
            <div>
              <h3>Account</h3>

              <p>
                Manage your Replay account
                information.
              </p>
            </div>

            <span className="settings-arrow">
              →
            </span>
          </button>

          <button
            type="button"
            className="settings-section settings-clickable"
            onClick={handleDataPrivacyClick}
          >
            <div>
              <h3>Data & Privacy</h3>

              <p>
                Manage your conversation data
                and privacy settings.
              </p>
            </div>

            <span className="settings-arrow">
              →
            </span>
          </button>

          <section className="settings-section">
            <div>
              <h3>Providers</h3>

              <p>
                ChatGPT is currently the
                supported provider for the MVP.
              </p>
            </div>
          </section>
        </div>
      </Modal>

      {isDataPrivacyOpen && (
        <DataPrivacyModal
          onClose={() =>
            setIsDataPrivacyOpen(false)
          }
        />
      )}
    </>
  );
}

export default SettingsModal;