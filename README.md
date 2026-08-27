# Replay

Replay is a local AI conversation manager that helps users save, organize, search, and revisit conversations from supported AI platforms in one place.

## Description

Replay is a full-stack application designed to make managing AI conversations easier. It combines a web application, backend API, PostgreSQL database, and Chrome extension to provide a centralized interface for conversations that would otherwise remain scattered across different AI platforms.

Replay currently supports ChatGPT. Users can import their ChatGPT conversation data into Replay or use the Chrome extension while viewing conversations in ChatGPT. Conversations can be saved to the user's local Replay database and enriched with AI-generated metadata such as titles and descriptions.

The Chrome extension provides quick access to recently opened conversations, displays the currently detected conversation, allows conversations to be saved to Replay, and provides access to the full Replay website. The website provides the larger conversation-management interface, including conversation details, descriptions, synchronization information, and conversation management.

Replay is designed to run locally. Each user provides and manages their own PostgreSQL database and API credentials through their local environment configuration. Replay does not rely on a central Replay database containing every user's conversations.

Because Replay runs locally, the backend, the PostgreSQL database, and the frontend must all be running while the web application is in use. The Chrome extension also communicates with the local Replay backend, so the backend and database must be running for the extension to save conversations or show Replay data.

Replay was created by a university student as a practical software engineering project, with a focus on building experience across databases, APIs, authentication, browser extensions, frontend and backend development, AI API integration, data processing, and software architecture.

### Core functionality

* Local Replay account creation and authentication
* PostgreSQL-backed conversation storage
* ChatGPT conversation importing
* Chrome extension for detecting the currently open ChatGPT conversation
* Chrome extension quick-access list containing up to 25 recently opened conversations
* Saving conversations to Replay
* Opening the original conversation
* Conversation details
* AI-generated conversation titles and descriptions
* Conversation metadata and synchronization information
* Conversation search and favourites
* Conversation statistics and activity overview
* Conversation deletion
* Local data and privacy controls/information
* Separate frontend, backend, and extension architecture
* Extensible provider architecture for future AI providers

## Getting Started

### Dependencies

Replay requires the following:

* Windows 10 or Windows 11 (Replay was developed and tested on Windows; macOS and Linux should also work but are untested)
* Node.js 20.19+ or 22.12+ (required by Vite 8)
* npm 10 or later
* Python 3.14 (developed against Python 3.14.3)
* PostgreSQL
* A PostgreSQL database created locally
* An OpenAI API key for AI-generated conversation metadata
* Google Chrome or a Chromium-based browser that supports Chrome extensions for the browser extension
* Git, if cloning the project from GitHub

The project uses the following major technologies:

* React
* TypeScript
* Vite
* Python
* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic
* Chrome Extension Manifest V3
* OpenAI API

### Installing

#### 1. Download Replay

Clone the repository:

```bash
git clone https://github.com/hamzahjar/Replay.git
cd Replay
```

Alternatively, download the repository as a ZIP file from GitHub and extract it.

#### 2. Install PostgreSQL

Install PostgreSQL on your computer:

https://www.postgresql.org/download/

Create a local PostgreSQL database for Replay.

You will need the following information:

```text
Database host: localhost
Database port: 5432
Database name: replay
Database username: postgres
Database password: [YOUR_DATABASE_PASSWORD]
```

#### 3. Configure the backend environment

Navigate to the backend:

```bash
cd backend
```

Create a `.env` file based on `.env.example`:

```bash
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead.

Add the required environment variables:

```env
# Replace "YOUR_POSTGRES_PASSWORD" with your password.
DATABASE_URL=postgresql+psycopg://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/replay

# Generate a random JWT secret at least 32 bytes long and replace "YOUR_RANDOM_SECRET_AT_LEAST_32_BYTES" with it.
# Example:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_BYTES

# Replace "YOUR_OPENAI_API_KEY" with your OpenAI API key.
# Only OpenAI API keys work.
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6-luna
```

`DATABASE_URL`, `JWT_SECRET`, and `OPENAI_API_KEY` are required and the backend will not start without them. `OPENAI_MODEL` is optional and defaults to `gpt-5.6-luna` when it is not set.

Two further settings are not included in `.env.example` and can be added to `.env` if you need them:

* `IMPORT_MAX_FILE_BYTES` — the largest `conversations.json` Replay will accept, in bytes. Defaults to `262144000` (250 MB).
* `IMPORT_GENERATE_METADATA` — whether to generate AI titles and descriptions during a bulk import. Defaults to `false`. See "Import cost" below.

Your `.env` file contains private credentials and **must not be committed to Git or uploaded publicly**.

#### 4. Install backend dependencies

Create and activate a Python virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

On macOS or Linux, use `source .venv/bin/activate` instead.

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

#### 5. Set up the database

Run the Replay database migrations:

```bash
alembic upgrade head
```

This creates the database tables required by Replay. On a new database this is the only command needed.

**Upgrading an existing database.** If you are upgrading a Replay database created by an older development version, Alembic may report that the `is_favourite` column already exists. This happens because earlier versions created that column at startup rather than through a migration. Confirm the column is genuinely present:

```bash
psql -U postgres -d replay -c "\d conversations"
```

If `is_favourite` is listed, record the migration as applied without running it again:

```bash
alembic stamp b1c2d3e4f5a6
```

Either way, confirm the database is up to date:

```bash
alembic current
```

This should report `b1c2d3e4f5a6 (head)`.

#### 6. Install frontend dependencies

Open another terminal and navigate to the frontend:

```bash
cd frontend
npm install
```

#### 7. Install extension dependencies

Open another terminal and navigate to the extension:

```bash
cd extension
npm install
```

#### 8. Build the extension

From the extension directory:

```bash
npm run typecheck
npm run build
```

#### 9. Load the extension into Chrome

1. Open Google Chrome or a Chromium-based browser that supports Chrome extensions.
2. Navigate to:

```text
chrome://extensions/
```

3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the Replay `extension` directory.
6. Load the `extension` directory itself, not `extension/dist`. The `manifest.json` file lives at the root of `extension` and references the built files inside `dist`, so the build step must be run before loading.

The Replay extension should now appear in Chrome.

### Executing program

Replay consists of three main parts that run together:

```text
Replay
├── Frontend
├── Backend
└── Chrome Extension
```

The backend and PostgreSQL database must be running for the website and Chrome extension to function correctly.

#### 1. Start the backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The backend API should become available at:

```text
http://localhost:8000
```

#### 2. Start the frontend

From the `frontend` directory:

```bash
npm run dev
```

The frontend should become available at:

```text
http://localhost:5173
```

#### 3. Open Replay

Open the frontend URL in your browser:

```text
http://localhost:5173
```

Create a Replay account or log in to an existing local account.

#### 4. Use the Chrome extension

Open ChatGPT in Google Chrome or a Chromium-based browser that supports Chrome extensions and navigate to a conversation.

The Replay extension can detect the currently open conversation and display information about it in the extension popup.

The extension provides:

* Current conversation information
* Conversation descriptions
* Recently opened conversations
* Up to 25 quick-access conversations
* Save to Replay functionality
* Conversation details
* Original conversation navigation
* Replay account authentication
* Access to the Replay website

#### 5. Save conversations

When a conversation is detected, open the Replay extension and use the save functionality to save the conversation to the Replay database.

Saved conversations can then be viewed through the Replay website.

#### 6. Import conversations

Replay also supports importing ChatGPT conversation exports.

**Request the export from ChatGPT**

1. Open ChatGPT and go to **Settings**.
2. Select **Data controls**.
3. Select **Export data**, then confirm the export.
4. OpenAI sends a download link by email. This usually arrives within minutes but can take up to 7 days.
5. The download link expires 24 hours after it arrives.

**Import the export into Replay**

1. Extract the downloaded ZIP file. Alongside `conversations.json` it contains a `chat.html` viewer, an `export_manifest.json` listing the exported files, and account files such as `user.json`, `user_settings.json`, `library_files.json`, and `ads.json`. Replay uses `conversations.json` only.
2. In Replay, open the import dialog.
3. Select the `conversations.json` file. Replay expects the `conversations.json` file from ChatGPT's own data export.
4. On larger exports, there's a possibility that there will be multiple `conversations.json` files. In this scenario, you must import each of the conversation files one by one, in no particular order.
5. Start the import.

The import runs in the background on the Replay backend. The import dialog reports progress as conversations are processed, then reports how many were imported when it finishes.

Importing the same export again updates the existing conversations rather than creating duplicates, so a newer export can safely be imported over an older one.

**How conversations are interpreted**

ChatGPT stores each conversation as a tree rather than a flat list, because editing a prompt or regenerating a response creates a new branch. Replay follows the active path through that tree, which is the version shown in ChatGPT, and ignores branches that were replaced.

Replay imports the user and assistant messages that make up the readable conversation. The following are excluded, because ChatGPT does not display them as part of the conversation either:

* Custom instructions and profile context
* Hidden system messages
* Tool calls made by the assistant, such as image-generation prompts and search queries
* Reasoning and "thought process" content from reasoning models
* Tool output such as browsing results

Replay imports conversation text and represents unsupported media using placeholders. Where a message contained an image, Replay records an `[Image]` placeholder in its place, and other attachments are recorded as `[Attachment]`. The files themselves are not downloaded or stored, as ChatGPT's export does not include them.

ChatGPT also embeds interface markers inside message text using private-use Unicode characters, covering things such as search citations and image-result groups. These are not readable text and display as unreadable characters if kept, so Replay removes them during import. The surrounding message text is preserved unchanged.

#### 7. AI-generated metadata

Replay can use the configured OpenAI API to generate conversation metadata, including:

* Conversation titles
* Short descriptions
* Long descriptions

The OpenAI API key remains in the backend environment configuration and is not placed in the frontend or Chrome extension.

When a conversation is saved through the Chrome extension, Replay generates this metadata automatically. If the AI request fails, the conversation is still saved without the generated metadata.

**Import cost**

Conversations saved through the Chrome extension always receive AI-generated metadata. Bulk imports do not, unless the setting below is enabled, so imported conversations show no short or long description until it is turned on.

Bulk imports do not generate AI metadata by default. A ChatGPT export can contain thousands of conversations, and generating metadata makes one API request per conversation. Replay uses the titles that ChatGPT already assigned instead, so importing an export costs nothing in API usage. The default is `false` so that a large import cannot use API credits unintentionally.

To generate descriptions for imported conversations, set the following in `.env`:

```env
IMPORT_GENERATE_METADATA=true
```

Then stop the backend completely and start it again. `uvicorn --reload` only watches Python files, so changes to `.env` are not picked up until the backend is restarted.

Re-importing the same file afterwards adds descriptions to conversations that were already imported, without creating duplicates.

Consider the number of conversations in your export before enabling this.

#### 8. Manage conversations

From the Replay website, users can:

* View their conversations
* Search their conversations
* Mark conversations as favourites
* View conversation and message statistics
* View an activity overview
* Open conversation details
* View generated descriptions
* View conversation metadata
* Import ChatGPT conversation exports
* Manage their profile and settings
* View local data and privacy information
* Delete conversations
* Open the original conversation

## Data & Privacy

### Your Data

Replay is designed to keep your AI conversations under your control. When you use Replay locally, your account information, conversations, messages, and generated metadata are stored in the PostgreSQL database configured on your own computer.

Replay does not operate a central database that stores everyone's conversations. Each installation uses its own local database and configuration.

### What Replay Stores

Depending on how you use Replay, it may store:

* Your Replay account information
* A securely hashed password for your local Replay account, stored using Argon2id. Replay never stores your password itself, and never stores your AI-provider password.
* Imported AI conversations
* Conversation messages
* Conversation titles
* AI-generated descriptions and summaries
* Conversation metadata such as provider, timestamps, and source
* Information needed to organize and manage your conversations

### AI Processing

Replay can use an AI API to generate information such as conversation titles, short descriptions, and long descriptions. When this functionality is used, conversation content may be sent to the AI provider configured in your local Replay installation for processing.

Your AI API key is stored in your local environment configuration and is not intended to be exposed through the Replay frontend or Chrome extension.

Bulk imports do not send conversation content to the AI provider unless `IMPORT_GENERATE_METADATA` is enabled.

### Your AI Provider Accounts

Replay does not require you to give Replay your ChatGPT, Claude, Gemini, or other AI-provider password.

The Chrome extension is designed to work with conversations you are already viewing in your supported AI provider, while imported conversations can be processed through Replay's import functionality.

### Local Data

Because Replay is designed to run locally, your PostgreSQL database and environment configuration remain on your computer. Other people using their own installation of Replay do not automatically have access to your database or conversations.

Anyone with access to your computer, PostgreSQL database, or local credentials may potentially be able to access your stored Replay data. You are responsible for protecting your computer and local credentials.

### Deleting Your Data

You can delete conversations from Replay through the application. Deleting a conversation removes its stored conversation data, including its messages, from the Replay database.

If you want to completely remove all Replay data, you can also remove your local Replay PostgreSQL database.

### Important

AI conversations can contain sensitive information, including personal information, source code, documents, credentials, or other private material. Only import or save conversations that you are comfortable storing locally and, where applicable, sending to the AI provider configured for AI processing.

## Known Limitations

* Replay currently supports ChatGPT only. The provider architecture is designed so that additional providers can be added later.
* Replay must be running locally to be used. The website and the Chrome extension both depend on the local backend and PostgreSQL database.
* Imports are processed by the running backend. If the backend is restarted while an import is in progress, that import stops and its status remains "processing". Running the import again resolves this, since re-importing does not create duplicates.
* The Chrome extension captures the messages currently rendered in the browser. ChatGPT only loads part of a very long conversation until it is scrolled, so a save may capture part of the conversation rather than all of it. Replay never replaces stored messages with a smaller set, so saving the same conversation again later adds to what is stored rather than discarding it. Scrolling to the top of a long conversation before saving captures more of it.
* Replay imports conversation text. Images, generated files, and Canvas documents are not stored.
* Very large exports may split conversations across more than one file instead of a single `conversations.json`. Replay imports one file at a time, so each file is selected and imported separately.
* Exports produced by third-party browser extensions are not supported. Replay expects the `conversations.json` file from ChatGPT's own data export.
* ChatGPT's export format changes as new features are released, so exports created by future versions of ChatGPT may contain content types Replay does not yet recognize.

## Help

### Backend does not start

Make sure:

* PostgreSQL is running.
* Your `.env` file exists.
* Your database credentials are correct.
* Your database exists.
* Your Python environment is activated.
* All backend dependencies have been installed.
* Your `JWT_SECRET` is at least 32 bytes long, otherwise startup fails validation.

Check the backend terminal for the exact error.

### Database connection errors

Verify your PostgreSQL connection information in `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/replay
```

Make sure the PostgreSQL server is running and that the specified database exists.

### Database migration errors

If the migration reports that multiple head revisions are present, the migration history has branched. Inspect it with:

```bash
alembic heads
alembic history
```

If the migration reports that a column already exists, the database already contains that change. Record the migration without re-applying it:

```bash
alembic stamp b1c2d3e4f5a6
```

### Frontend cannot connect to the backend

Make sure the backend is running at:

```text
http://localhost:8000
```

Also verify that the frontend is using the correct backend URL. The backend only allows browser requests from `http://localhost:5173` and `http://127.0.0.1:5173`, so run the frontend on port 5173.

### Extension does not appear in Chrome

Open:

```text
chrome://extensions/
```

Make sure:

* Developer mode is enabled.
* The correct Replay extension directory was loaded.
* The extension built successfully.
* There are no errors shown on the extension card.

### Extension does not detect a conversation

Make sure:

* You are using Google Chrome or a Chromium-based browser that supports Chrome extensions.
* You are logged into ChatGPT.
* You have opened an actual ChatGPT conversation.
* The Replay extension is enabled.
* The extension was rebuilt after source-code changes.

### Extension cannot save a conversation

The extension sends conversations to the local Replay backend. Make sure the backend is running at `http://localhost:8000`, that PostgreSQL is running, and that you are logged in to Replay through the extension.

### Import is rejected

Replay reports a message describing the problem:

* **Not a ChatGPT conversations.json export** — the file is not in the expected format.
* **A single conversation exported by a browser extension** — the file came from a third-party extension. Use the `conversations.json` file from ChatGPT's own data export instead.
* **The file contains a single conversation** — the file holds one conversation rather than the full export.
* **The import file must be a JSON file** — select `conversations.json`, not the ZIP file or `chat.html`.
* **The import file is larger than 250 MB** — raise `IMPORT_MAX_FILE_BYTES` in `.env` if your export is genuinely larger.

### Import finishes but some conversations were not imported

The import reports a count of failed conversations. Conversations are skipped when they contain no readable user or assistant messages, or when their stored structure cannot be interpreted. The rest of the import is unaffected.

### Import stays at "processing"

The import runs inside the backend process. If the backend was restarted while the import was running, the job stops and its status is not updated. Run the import again. Re-importing the same export does not create duplicates.

### AI-generated descriptions do not work

Verify that:

* Your OpenAI API key is configured correctly.
* The backend is running.
* The API key has available credit/billing configured.
* The relevant OpenAI API functionality is available to your account.

Replay uses the model set in the `OPENAI_MODEL` environment variable. When that variable is empty or not set, the backend falls back to its configured default of `gpt-5.6-luna`.

Note that bulk imports do not generate descriptions unless `IMPORT_GENERATE_METADATA=true` is set. This is expected behaviour, not a failure.

### A saved conversation is missing messages

The extension can only read the messages ChatGPT has rendered in the page. Long conversations are loaded in parts as you scroll, so a save made without scrolling captures only the visible portion. Scroll to the top of the conversation so the earlier messages load, then save again.

Saving again is safe. Replay never replaces stored messages with a smaller set, so a later partial save cannot remove messages that were already saved.

### Changes to `.env` have no effect

The backend reads `.env` once at startup. `uvicorn --reload` watches Python files only, so editing `.env` does not restart it. Stop the backend completely and start it again after changing any environment variable.

### Useful commands

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
npm install
npm run dev
npm run build
```

Extension:

```bash
npm install
npm run typecheck
npm run build
```

Database:

```bash
alembic upgrade head
alembic downgrade -1
alembic current
alembic history
alembic heads
alembic stamp <revision>
alembic revision --autogenerate -m "your message"
```

## Authors

Hamzah Jarrar

hamzahjarrar3787@gmail.com

https://github.com/hamzahjar

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

* OpenAI for the AI API used for conversation processing.
* FastAPI for the backend framework.
* React and Vite for the frontend development environment.
* PostgreSQL and SQLAlchemy for database storage and ORM functionality.
* Alembic for database migrations.
* Chrome Extensions / Manifest V3 for the browser extension platform.