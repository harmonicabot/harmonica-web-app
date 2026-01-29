<p align="center">
  <img src="public/harmonica.svg" alt="Harmonica" width="80" height="80" />
</p>

<h1 align="center">Harmonica</h1>

<p align="center">
  <strong>Self-hosted AI facilitation for group sensemaking and deliberation</strong>
</p>

<p align="center">
  <a href="https://github.com/harmonicabot/harmonica-web-app/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <a href="code_of_conduct.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" alt="Contributor Covenant"></a>
  <a href="https://harmonica.chat"><img src="https://img.shields.io/badge/demo-harmonica.chat-purple" alt="Demo"></a>
</p>

<p align="center">
  <a href="https://harmonica.chat">Website</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What is Harmonica?

Harmonica is an open-source platform for AI-facilitated group deliberation. Deploy it on your own infrastructure with your choice of LLM—whether self-hosted (Ollama, vLLM) or cloud providers (OpenAI, Anthropic, Google).

Instead of scattered feedback forms or unproductive meetings, participants engage in AI-facilitated conversations that surface the *why* behind their perspectives.

**How it works:**

1. **Create** a session with your discussion topic
2. **Share** the link with participants
3. **Analyze** the AI-generated synthesis with themes, priorities, and recommendations

Each participant has a private conversation with a custom AI facilitator. Harmonica then synthesizes all perspectives into actionable insights—surfacing consensus, highlighting tensions, and recommending next steps.

## Features

- **Conversational surveys** — Go beyond checkboxes. AI-guided dialogue captures context and nuance.
- **Async participation** — No scheduling conflicts. Participants respond on their own time.
- **Multi-language support** — Participants can converse in their preferred language.
- **Thematic synthesis** — Automatically clusters responses into themes and priorities.
- **Cross-pollination** — Share insights across related sessions to build on each other's ideas.
- **Workspaces** — Organize sessions for teams, projects, or communities.
- **Custom prompts** — Tailor the AI facilitator's behavior to your context.
- **File uploads** — Attach PDFs and documents for context.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or [Neon](https://neon.tech) for serverless)
- Auth0 account
- LLM provider (choose one):
  - **Self-hosted**: Ollama, vLLM, or any OpenAI-compatible endpoint
  - **Cloud**: OpenAI, Anthropic, Google, or [other supported providers](#llm-providers)

### Installation

```bash
git clone https://github.com/harmonicabot/harmonica-web-app.git
cd harmonica-web-app
npm install
```

### Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Neon/PostgreSQL connection string |
| `AUTH0_*` | Auth0 configuration (see [Auth0 docs](https://auth0.com/docs)) |
| `MAIN_LLM_PROVIDER` | LLM provider: `openai`, `anthropic`, `gemini`, `ollama`, etc. |
| `MAIN_LLM_MODEL` | Model name (e.g., `gpt-4o`, `claude-3-opus`, `llama3.2`) |

For embeddings, set `OPENAI_API_KEY` or configure an alternative embedding provider.

### Database Setup

```bash
npm run migrate
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Neon) + Kysely |
| Auth | Auth0 |
| LLM | LlamaIndex with pluggable providers |
| Vector DB | Qdrant |
| UI | Tailwind CSS + Radix UI |
| Hosting | Vercel (or self-hosted) |

### LLM Providers

Harmonica supports multiple LLM backends through LlamaIndex:

| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5 | Cloud API |
| Anthropic | Claude 3.5, Claude 3 | Cloud API |
| Google | Gemini Pro, Gemini Flash | Cloud API |
| Ollama | Llama 3, Mistral, Qwen | Self-hosted |
| vLLM | Any supported model | Self-hosted, OpenAI-compatible |
| [PublicAI](https://platform.publicai.co/) | Open-source models | Gateway to open AI models |

Configure via `{TIER}_LLM_PROVIDER` and `{TIER}_LLM_MODEL` environment variables (tiers: SMALL, MAIN, LARGE).

## Partnerships & Research

Harmonica is developed in collaboration with the governance research community:

<table>
  <tr>
    <td align="center" width="33%">
      <a href="https://metagov.org/projects/interop">
        <strong>Metagov Interop</strong>
      </a>
      <br />
      First cohort participant in the Interoperable Deliberative Tools program
    </td>
    <td align="center" width="33%">
      <a href="https://metagov.github.io/gov-acc/">
        <strong>Gov-ACC</strong>
      </a>
      <br />
      Data collection tool for governance research in web3 communities
    </td>
    <td align="center" width="33%">
      <a href="https://platform.publicai.co/">
        <strong>PublicAI</strong>
      </a>
      <br />
      Partnered for open-source AI model access
    </td>
  </tr>
</table>

See also: [Open Facilitation Library](https://github.com/Open-Facilitation-Library) — our sister project developing reusable facilitation patterns, also part of Metagov Interop.

## Project Structure

```
src/
├── app/                 # Next.js pages and API routes
│   ├── api/             # Backend endpoints
│   ├── chat/            # Participant chat interface
│   ├── create/          # Session creation flow
│   └── sessions/        # Session management
├── components/          # React components
├── lib/
│   ├── monica/          # RAG/LLM query system
│   ├── schema.ts        # Database schema
│   └── crossPollination.ts
└── db/migrations/       # Database migrations
```

## Contributing

We welcome contributions! Please see our [Code of Conduct](code_of_conduct.md) before participating.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Apache License 2.0](LICENSE)

---

<p align="center">
  Built by the <a href="https://github.com/harmonicabot">Harmonica</a> team
</p>
