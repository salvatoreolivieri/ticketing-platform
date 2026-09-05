# ADR 0001 — Paginazione

## Stato
Accettato.

## Contesto
Lo scenario 4 (sync notturna dei partner) legge fino a 50.000 ordini. Serve una strategia di
paginazione e un limite massimo di pagina.

## Decisione
- Paginazione **offset-based** (`page`, `limit`), coerente con `ApiPaginatedResponse`.
- `page` intero ≥ 1, `limit` intero ≥ 1.
- **Limite massimo di pagina = 100**: se `limit` supera 100 la risposta è **400**.
- Default: `limit = 20` per la lista eventi (browse mobile), `limit = 100` per la lista ordini
  (sync partner).
- `totalPages = ceil(total / limit)`.

## Conseguenze
Deterministica e semplice da consumare. La sync notturna itera le pagine da 100 fino a esaurire
`totalPages`. L'ordinamento è stabile (`createdAt`, poi `id`) così le pagine non si sovrappongono.
