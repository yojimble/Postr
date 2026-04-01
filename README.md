# Postr

A Nostr client for posting notes, images, and classified ads.

## Features

- **Notes** — post kind 1 text notes with optional image attachments
- **Images** — post kind 20 picture events (NIP-68) with captions
- **Classified Ads** — post NIP-99 classified listings (kind 30402) with title, summary, description, price, location, category, stock count, and up to 5 specifications
- **Multi-relay support** — configure up to 3 relays via the settings panel
- **Nostr login** — sign events with any NIP-07 browser extension

## Built With

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Nostrify](https://nostrify.dev/)
- [MKStack](https://soapbox.pub/mkstack)

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or higher). If you don't have it, install via [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts
```

**Run locally:**

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

You'll need a NIP-07 browser extension to sign in, such as [Alby](https://getalby.com) or [nos2x](https://github.com/fiatjaf/nos2x).

## License

MIT
