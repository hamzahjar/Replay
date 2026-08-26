import Modal from "../shared/Modal";

interface DataPrivacyModalProps {
  onClose: () => void;
}

function DataPrivacyModal({
  onClose,
}: DataPrivacyModalProps) {
  return (
    <Modal
      onClose={onClose}
      className="data-privacy-modal"
      ariaLabel="Data and Privacy"
    >
      <div className="modal-heading">
        <h2>Data & Privacy</h2>

        <p>
          Manage your Replay data and privacy.
        </p>
      </div>

      <div className="modal-divider" />

      <div className="data-privacy-content">
        <section>
          <h3>Your Data</h3>
          <p>
            Replay is designed to keep your AI conversations under your
            control. When you use Replay locally, your account information,
            conversations, messages, and generated metadata are stored in the
            PostgreSQL database configured on your own computer.
          </p>
          <p>
            Replay does not operate a central database that stores everyone's
            conversations. Each installation uses its own local database and
            configuration.
          </p>
        </section>

        <section>
          <h3>What Replay Stores</h3>
          <p>
            Depending on how you use Replay, it may store:
          </p>
          <ul>
            <li>Your Replay account information</li>
            <li>Imported AI conversations</li>
            <li>Conversation messages</li>
            <li>Conversation titles</li>
            <li>AI-generated descriptions and summaries</li>
            <li>
              Conversation metadata such as provider, timestamps, and source
            </li>
            <li>
              Information needed to organize and manage your conversations
            </li>
          </ul>
        </section>

        <section>
          <h3>AI Processing</h3>
          <p>
            Replay can use an AI API to generate information such as
            conversation titles, short descriptions, and long descriptions.
            When this functionality is used, conversation content may be sent
            to the AI provider configured in your local Replay installation
            for processing.
          </p>
          <p>
            Your AI API key is stored in your local environment configuration
            and is not intended to be exposed through the Replay frontend or
            Chrome extension.
          </p>
        </section>

        <section>
          <h3>Your AI Provider Accounts</h3>
          <p>
            Replay does not require you to give Replay your ChatGPT, Claude,
            Gemini, or other AI-provider password.
          </p>
          <p>
            The Chrome extension is designed to work with conversations you
            are already viewing in your supported AI provider, while imported
            conversations can be processed through Replay's import
            functionality.
          </p>
        </section>

        <section>
          <h3>Local Data</h3>
          <p>
            Because Replay is designed to run locally, your PostgreSQL
            database and environment configuration remain on your computer.
            Other people using their own installation of Replay do not
            automatically have access to your database or conversations.
          </p>
          <p>
            Anyone with access to your computer, PostgreSQL database, or local
            credentials may potentially be able to access your stored Replay
            data. You are responsible for protecting your computer and local
            credentials.
          </p>
        </section>

        <section>
          <h3>Deleting Your Data</h3>
          <p>
            You can delete conversations from Replay through the application.
            Deleting a conversation removes its stored conversation data from
            the Replay database.
          </p>
          <p>
            If you want to completely remove all Replay data, you can also
            remove your local Replay PostgreSQL database.
          </p>
        </section>

        <section>
          <h3>Important</h3>
          <p>
            AI conversations can contain sensitive information, including
            personal information, source code, documents, credentials, or
            other private material. Only import or save conversations that you
            are comfortable storing locally and, where applicable, sending to
            the AI provider configured for AI processing.
          </p>
        </section>
      </div>
    </Modal>
  );
}

export default DataPrivacyModal;