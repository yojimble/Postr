# Postr — Nostr protocol notes

Postr publishes only standard event kinds; it defines no custom kinds. This file
documents the conventions Postr follows where a base NIP leaves room for
interpretation.

## Classified listings (kind 30402)

Postr's classified ad composer (`/post/classified`, `src/pages/PostNotePage.tsx`)
publishes **NIP-99** classified listings, extended with the
[GammaMarkets market-spec](https://github.com/GammaMarkets/market-spec/blob/main/spec.md),
the e-commerce extension proposal referenced by NIP-99 itself.

We follow the GammaMarkets spec so that listings interoperate with marketplace
clients that implement it, rather than inventing our own tag names.

### Inventory: use `stock`, not `quantity`

Base NIP-99 defines **no** inventory tag. The GammaMarkets spec defines:

```
["stock", "<integer>"]   // available quantity as an integer
```

Postr previously emitted `["quantity", "<integer>"]`, which is not a tag any
marketplace client reads — listings therefore showed as out of stock (0)
regardless of the value entered in the composer. Use `stock`.

### Tags Postr emits for kind 30402

From NIP-99:

- `["d", "<uuid>"]` — random UUID per listing
- `["title", "<string>"]`
- `["summary", "<string>"]`
- `["published_at", "<unix seconds>"]` — matches the event's `created_at`
- `["status", "active"]`
- `["price", "<number>", "<currency>"]` — currency defaults to `USD`
- `["location", "<string>"]`
- `["t", "<category>"]` — lowercased; single-letter tag so relays index it
- `["image", "<url>"]` plus the NIP-94 `imeta` tags returned by the upload

From the GammaMarkets market-spec:

- `["stock", "<integer>"]`
- `["spec", "<name>", "<value>"]` — repeated, one per product specification

The listing description is Markdown in the event `content`, per NIP-99.

## Custom creation date

The note and image composer tabs accept an optional date, which sets the
event's `created_at`. Relays commonly reject events timestamped in the future,
and some reject old timestamps — backdating is generally accepted, post-dating
may silently fail.
