# TransPop

TransPop is a lightweight desktop translation popup built with Tauri, React, and TypeScript. It is designed for a fast workflow: summon the window, type or paste text, get a translation automatically, and let the window disappear when you return to your work.

## Features

- **Floating desktop translator**: borderless, always-on-top, taskbar-hidden Tauri window.
- **Fast keyboard workflow**: default global shortcut is `Alt + Space`; shortcut can be disabled or re-recorded.
- **Auto translation**: translates automatically after typing stops for 1 second; `Enter` still triggers immediate translation.
- **OpenAI-compatible LLMs**: configure any OpenAI-compatible endpoint, including providers such as Kimi or Qwen.
- **Supported API interfaces only**:
  - Responses API (`/responses`)
  - Chat Completions API (`/chat/completions`)
  - Anthropic Messages API is not supported.
- **Smart target language**: Chinese input defaults to English; other input defaults to Chinese.
- **Paste-ready workflow**: the global shortcut focuses the input immediately; paste or type text, while optional auto-copy keeps translated results ready to use.
- **Local persistence**: settings, shortcut state, API configuration, and recent translation history are stored locally in SQLite.
- **API key safety**: API keys are encrypted before being saved in SQLite; the encryption key is stored with the OS keyring.
- **Recent history**: shows the latest 3 translations in the popup and keeps up to 100 local history records.

## Tech Stack

| Area | Tech |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 + custom UI primitives |
| State | Zustand |
| Backend | Rust |
| Storage | SQLite (`rusqlite`) |
| Secrets | AES-GCM + OS keyring |

## Requirements

- Node.js and pnpm
- Rust toolchain with Cargo
- Platform dependencies required by Tauri 2 for your OS

This project uses pnpm for Node dependencies.

## Development

Install dependencies:

```bash
pnpm install
```

Run the frontend only:

```bash
pnpm dev
```

Run the Tauri app in development mode:

```bash
pnpm run tauri:dev
```

Build the frontend:

```bash
pnpm build
```

Build the Tauri app:

```bash
pnpm tauri build
```

## Releasing Installers

The release workflow is `.github/workflows/publish.yml`. It is triggered by pushing a version tag that starts with `v`, for example `v0.1.0`. The tag must match `src-tauri/tauri.conf.json`'s `version` field.

Release steps:

1. Update the app version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `package.json`.
2. Commit the version change.
3. Create and push a matching tag, for example:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. Wait for the **Publish installers** GitHub Actions workflow to finish. The workflow first creates a draft release, uploads all installers into that single release, and publishes it automatically only after every platform build succeeds.

You can also rerun the workflow manually from GitHub Actions with an existing tag name, as long as that release has not already been published.

## LLM Configuration

Open **Settings 閳?LLM API** in the app and configure:

- **Base URL**: the OpenAI-compatible API base URL, for example `https://api.openai.com/v1`.
- **Interface**: choose `Responses` or `Chat Completions`.
- **Model**: the model name required by your provider.
- **API Key**: saved locally after encryption.

Examples:

| Provider style | Base URL | Interface | Model example |
| --- | --- | --- | --- |
| OpenAI-compatible Responses | `https://api.openai.com/v1` | Responses | `gpt-5.4` |
| Kimi / Moonshot compatible | provider `/v1` endpoint | Chat Completions | `moonshot-v1-8k` |
| Qwen compatible | provider `/v1` endpoint | Chat Completions | `qwen-plus` |

Use the exact base URL and model name documented by your LLM provider.

## Security Notes

TransPop stores local application data in a SQLite database under the Tauri app data directory. API keys are not stored as plaintext: they are encrypted with AES-GCM and the encryption key is saved in the operating system keyring.

## Project Structure

```text
src/
  App.tsx                  # Thin application entry point
  app/                     # Application shell and lifecycle hooks
  features/                # Feature modules (translation, settings, command palette)
  components/layout/       # Shared application layout components
  components/ui/           # Reusable UI primitives
  api/                     # Frontend Tauri API wrappers
  lib/                     # Runtime and clipboard adapters
  store/                   # Zustand state
  styles/                  # Global theme, base, layout, and responsive styles
  types/                   # Shared frontend types

src-tauri/src/
  lib.rs                   # Tauri setup, plugins, window events
  db.rs                    # SQLite persistence and API key encryption
  translate.rs             # OpenAI-compatible Responses / Chat Completions requests
  shortcut.rs              # Global shortcut registration
  window.rs                # Show/hide/focus commands
```

## License

MIT. See [LICENSE](./LICENSE).
