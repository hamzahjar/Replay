import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Modal from "../shared/Modal";
import {
  getImportJob,
  importChatGPTExport,
  type ImportJob,
} from "../../services/api";

interface ImportModalProps {
  onClose: () => void;
  onImported: () => Promise<void>;
}

const TERMINAL_STATUSES = [
  "completed",
  "completed_with_errors",
  "failed",
];

const POLL_INTERVAL_MS = 1500;

function ImportModal({
  onClose,
  onImported,
}: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isImporting, setIsImporting] =
    useState(false);

  const [progress, setProgress] =
    useState<ImportJob | null>(null);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setError("");
    setSuccessMessage("");
    setProgress(null);
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, ms),
    );
  }

  async function waitForCompletion(
    importJobId: number,
  ): Promise<ImportJob | null> {
    while (isMountedRef.current) {
      await delay(POLL_INTERVAL_MS);

      if (!isMountedRef.current) {
        return null;
      }

      const job = await getImportJob(importJobId);

      if (isMountedRef.current) {
        setProgress(job);
      }

      if (TERMINAL_STATUSES.includes(job.status)) {
        return job;
      }
    }

    return null;
  }

  async function handleImport() {
    if (!selectedFile) {
      setError("Select a ChatGPT JSON export first.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setProgress(null);
    setIsImporting(true);

    try {
      const created =
        await importChatGPTExport(selectedFile);

      if (isMountedRef.current) {
        setProgress(created);
      }

      const finished = await waitForCompletion(
        created.id,
      );

      if (!finished || !isMountedRef.current) {
        return;
      }

      if (finished.status === "failed") {
        setError(
          finished.error_message ??
            "The import failed.",
        );
        return;
      }

      await onImported();

      if (!isMountedRef.current) {
        return;
      }

      const failedNote =
        finished.failed_conversations > 0
          ? ` ${finished.failed_conversations} could not be imported.`
          : "";

      setSuccessMessage(
        `${finished.processed_conversations} of ${finished.total_conversations} conversations imported.${failedNote}`,
      );
    } catch (error) {
      if (isMountedRef.current) {
        setError(
          error instanceof Error
            ? error.message
            : "The import failed.",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }

  function renderProgress() {
    if (!progress || !isImporting) {
      return null;
    }

    if (progress.total_conversations === 0) {
      return (
        <p className="import-progress">
          Reading your export...
        </p>
      );
    }

    return (
      <p className="import-progress">
        Importing {progress.processed_conversations} of{" "}
        {progress.total_conversations} conversations...
      </p>
    );
  }

  return (
    <Modal
      onClose={onClose}
      className="import-modal"
      ariaLabel="Import ChatGPT conversations"
    >
      <div className="modal-heading">
        <h2>Import Conversations</h2>

        <p>
          Select the conversations.json file from your
          ChatGPT data export.
        </p>
      </div>

      <div className="import-content">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          hidden
        />

        <button
          type="button"
          className="import-file-button"
          onClick={() => inputRef.current?.click()}
          disabled={isImporting}
        >
          <img
            src="/assets/upload.png"
            alt=""
            aria-hidden="true"
          />

          <span>
            {selectedFile
              ? selectedFile.name
              : "Choose JSON export"}
          </span>
        </button>

        {renderProgress()}

        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="modal-success">
            {successMessage}
          </p>
        )}

        <button
          type="button"
          className="modal-primary-button"
          onClick={handleImport}
          disabled={!selectedFile || isImporting}
        >
          {isImporting
            ? "Importing..."
            : "Import Conversations"}
        </button>
      </div>
    </Modal>
  );
}

export default ImportModal;
