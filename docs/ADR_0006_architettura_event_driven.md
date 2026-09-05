# ADR 0006 — Architettura event-driven (minimale)

## Stato
Accettato.

## Contesto
Il codebase segue una DDD minimale con architettura event-driven. Non c'è broker: i servizi sono
processi separati, in memoria.

## Decisione
- **Event bus in-process** per servizio (`packages/shared/event-bus.ts`), pub/sub sincrono. È
  **intra-servizio**: non attraversa la rete.
- Eventi di dominio emessi dagli use-case:
  - **Inventory:** `SeatsReserved`, `SeatsReleased`, `InventoryAdjusted` → handler di log.
  - **Orders:** `OrderPlaced` → **proiezione Ticket** (crea il biglietto), esempio reale di
    comando → evento → proiezione dentro un servizio.
  - **Catalog:** sola lettura, nessun evento.
- La comunicazione **cross-service** resta HTTP sincrona (gateway → servizi, Orders → Inventory),
  esattamente come nel diagramma del design.
- **Hold a 10 minuti:** la prenotazione crea un hold con `expiresAt`; la scadenza è **lazy** (gli
  hold scaduti vengono rilasciati prima di ogni lettura/prenotazione), così non servono timer.

## Conseguenze
L'aspetto event-driven è dimostrato dove ha valore (proiezione biglietti, rilascio hold) senza
introdurre un broker. Aggiungere un broker reale in futuro significa sostituire l'implementazione
del bus, non gli use-case.
