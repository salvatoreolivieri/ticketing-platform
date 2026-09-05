# ADR 0004 — Confini dei servizi e proprietà del dato

## Stato
Accettato.

## Contesto
Ogni servizio possiede il proprio dato (in memoria). Il concetto di "tier" compare però sia in
Catalog (`GET /events/:id/tiers`) sia in Inventory ("tiers, holds").

## Decisione
- **Catalog** possiede eventi, venue, organizer e il **catalogo dei tier** (id, nome, prezzo,
  quantità) come modello di lettura ("cambia raramente"). Servizio di sola lettura.
- **Inventory** possiede la **disponibilità live + gli hold**, per `tierId`: è la fonte di verità
  per prenotazione (`reserve`) e rettifica (`inventory PATCH`).
- **Orders** possiede ordini e biglietti, più uno **snapshot dei prezzi** (`tierId → prezzo`)
  seminato dalla stessa sorgente deterministica, usato solo per calcolare `totalCents` di un nuovo
  ordine. L'unica chiamata cross-service di Orders è **`reserve` verso Inventory**.
- Il dato "tier" vive quindi **in due posti** (copia di lettura in Catalog, verità live in
  Inventory). È il modello del design e la ragione dello scenario 5: il gateway legge i tier da
  Catalog e **non** li riconcilia.

## Conseguenze
Confini netti, nessuna dipendenza non dichiarata. Gli store sono seminati dallo stesso fixture
deterministico, quindi i numeri coincidono all'avvio. La quantità "seats left" esposta dal gateway
proviene dalla copia Catalog: coerente col design, ma è un dato che può essere leggermente vecchio
(vedi [ADR 0005](ADR_0005_gateway_composizione.md)).
