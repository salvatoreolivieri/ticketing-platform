# ADR 0003 — Versioning

## Stato
Accettato.

## Contesto
L'integrazione partner dello scenario 4 non viene toccata da due anni. Le rotte esposte ai partner
devono restare stabili nel tempo.

## Decisione
- Versioning **nel path** (`/api/v1/...`). Le versioni esistenti restano **retro-compatibili**:
  cambiamenti breaking introducono una nuova versione (`v2`), non modificano `v1`.
- Anche le rotte interne chiamate dal gateway sono versionate, per coerenza e come best practice —
  pur non essendo strettamente necessario, dato che gateway e servizi sono deployati insieme.
- In questa implementazione esiste solo `v1`; `v2` è una strategia documentata, non ancora costruita.

## Conseguenze
I partner possono restare su `v1` a tempo indefinito. Un campo nuovo e additivo (es. `venueId` in
`GET /events/:id`) non è un breaking change e non richiede `v2`.
