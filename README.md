# Simple DB CLI

Una semplice applicazione CLI per la gestione di un database JSON. Questa applicazione consente di creare, leggere, aggiornare, eliminare tabelle e record. Supporta anche la gestione delle transazioni, il backup e il ripristino del database.

## Prerequisiti

- Node.js (versione 14 o successiva)

## Installazione

1. Clona il repository:

   ```bash
   git clone https://github.com/tuo-username/simple-db-cli.git
   cd simple-db-cli
Installa le dipendenze:

bash
Copia codice
npm install
Uso
Avvia l'applicazione CLI:

bash
Copia codice
node index.js
Comandi Disponibili
createTable <tableName>
Crea una nuova tabella con il nome specificato.

Esempio:

bash
Copia codice
createTable users
dropTable <tableName>
Elimina la tabella con il nome specificato.

Esempio:

bash
Copia codice
dropTable users
insert <tableName> <key=value> [<key=value> ...]
Inserisce un nuovo record nella tabella specificata. I valori vengono assegnati ai campi del record e viene generato un ID unico per il record.

Esempio:

bash
Copia codice
insert users name=John age=30
update <tableName> <id> <key=value> [<key=value> ...]
Aggiorna il record con l'ID specificato nella tabella indicata. I campi del record vengono aggiornati con i nuovi valori.

Esempio:

bash
Copia codice
update users 12345 name=John Doe age=31
delete <tableName> <id>
Elimina il record con l'ID specificato dalla tabella indicata.

Esempio:

bash
Copia codice
delete users 12345
read <tableName>
Legge e visualizza tutti i record nella tabella specificata.

Esempio:

bash
Copia codice
read users
startTransaction
Inizia una nuova transazione. Tutte le modifiche fatte durante la transazione saranno registrate e potranno essere confermate o annullate.

Esempio:

bash
Copia codice
startTransaction
commitTransaction
Conferma tutte le modifiche fatte durante la transazione e le applica al database.

Esempio:

bash
Copia codice
commitTransaction
rollbackTransaction
Annulla tutte le modifiche fatte durante la transazione, senza applicarle al database.

Esempio:

bash
Copia codice
rollbackTransaction
backupDB
Esegue un backup del database nella directory backup.

Esempio:

bash
Copia codice
backupDB
restoreDB
Ripristina il database dall'ultimo backup nella directory backup.

Esempio:

bash
Copia codice
restoreDB
restorePart <tableName>
Ripristina una tabella specifica dall'ultimo backup nella directory backup.

Esempio:

bash
Copia codice
restorePart users
Directory Struttura
db/ - Directory principale per i file del database.
backup/ - Directory per i backup del database.
Note
Il sistema utilizza file JSON per memorizzare i dati delle tabelle.
I lock per tabelle sono implementati in modo rudimentale; per un'applicazione più complessa, considera l'uso di tecniche di locking più avanzate.
Contributi
Se desideri contribuire al progetto, apri una pull request o segnalaci eventuali problemi attraverso le issue.