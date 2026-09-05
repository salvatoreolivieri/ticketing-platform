# ADR 0002 — Batch fetching

## Stato
Accettato.

## Contesto
La lista browse (scenario 2) mostra 20 eventi in un colpo solo, su rete mobile 4G: il payload deve
restare piccolo e la lista recuperabile in **una** richiesta.

## Decisione
- `GET /api/v1/events` restituisce una **pagina** di eventi in una sola richiesta (nessuna
  richiesta-per-evento).
- La dimensione di default è **20**, ma è **modificabile** via `limit` (fino al massimo di 100 —
  vedi [ADR 0001](ADR_0001_paginazione.md)).
- Ogni riga della lista contiene solo `id`, `title`, `startsAt` e il prezzo del tier più basso
  (`tier.price`): il minimo per lo scenario 2, così il payload resta leggero.

## Conseguenze
Un client recupera 20 (o N) eventi con una chiamata. Il gateway GraphQL mappa la lista con una sola
chiamata REST a Catalog.
