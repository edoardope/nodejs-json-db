const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Define the path to the database directory
const dbDir = path.join(__dirname, 'db');

// Create an interface for reading lines from the console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let isInTransaction = false;
let transactionData = {};
const locks = new Map(); // Store locks for each table

// Ensure the database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Helper function to get the path of a table file
const getTablePath = (tableName) => path.join(dbDir, `${tableName}.json`);

// Locking mechanism
const acquireLock = (tableName) => {
    while (locks.has(tableName)) {
        require('deasync').runLoopOnce(); // Wait for the lock to be released
    }
    locks.set(tableName, true);
};

const releaseLock = (tableName) => {
    locks.delete(tableName);
};

// Load DB from file
const loadTable = (tableName, callback) => {
    const tablePath = getTablePath(tableName);
    fs.readFile(tablePath, 'utf8', (err, data) => {
        if (err) {
            callback(err, []);
        } else {
            try {
                const tableData = JSON.parse(data);
                callback(null, tableData);
            } catch (err) {
                callback(err, []);
            }
        }
    });
};

// Save DB to file
const saveTable = (tableName, data, callback) => {
    const tablePath = getTablePath(tableName);
    fs.writeFile(tablePath, JSON.stringify(data, null, 2), 'utf8', callback);
};

// Define functions to be executed based on commands
const functions = {
    createTable: (tableName) => {
        const tablePath = getTablePath(tableName);
        if (fs.existsSync(tablePath)) {
            console.log(`Table "${tableName}" already exists.`);
            return;
        }

        const tableData = {
            records: []
        };

        fs.writeFile(tablePath, JSON.stringify(tableData, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('Error writing table file', err);
            } else {
                console.log(`Table "${tableName}" created.`);
            }
        });
    },

    dropTable: (tableName) => {
        const tablePath = getTablePath(tableName);
        fs.unlink(tablePath, (err) => {
            if (err) {
                console.error('Error dropping the table', err);
            } else {
                console.log(`Table "${tableName}" dropped.`);
            }
        });
    },

    insert: (tableName, ...keyValuePairs) => {
        if (isInTransaction) {
            if (!transactionData[tableName]) {
                transactionData[tableName] = { inserts: [], updates: [], deletes: [] };
            }

            const record = {};
            keyValuePairs.forEach(pair => {
                const [key, value] = pair.split('=');
                record[key] = value;
            });

            record.id = crypto.randomUUID(); // Generate a unique ID for the new record
            transactionData[tableName].inserts.push(record);

            console.log(`Recorded insert into table "${tableName}" with id "${record.id}" in the transaction.`);
            return;
        }

        acquireLock(tableName);

        const record = {};
        keyValuePairs.forEach(pair => {
            const [key, value] = pair.split('=');
            record[key] = value;
        });

        record.id = crypto.randomUUID(); // Generate a unique ID for the new record

        loadTable(tableName, (err, tableData) => {
            if (err) {
                console.error('Error loading table data', err);
                return;
            }

            tableData.records.push(record);

            saveTable(tableName, tableData, (err) => {
                if (err) {
                    console.error('Error saving table data', err);
                } else {
                    console.log(`Inserted object into table "${tableName}" with id "${record.id}".`);
                }
                releaseLock(tableName);
            });
        });
    },

    update: (tableName, id, ...keyValuePairs) => {
        if (isInTransaction) {
            if (!transactionData[tableName]) {
                transactionData[tableName] = { inserts: [], updates: [], deletes: [] };
            }

            const updates = {};
            keyValuePairs.forEach(pair => {
                const [key, value] = pair.split('=');
                updates[key] = value;
            });

            transactionData[tableName].updates.push({ id, updates });

            console.log(`Recorded update to object with id "${id}" in table "${tableName}" in the transaction.`);
            return;
        }

        acquireLock(tableName);

        loadTable(tableName, (err, tableData) => {
            if (err) {
                console.error('Error loading table data', err);
                return;
            }

            const record = tableData.records.find(record => record.id === id);
            if (!record) {
                console.log(`Record with id "${id}" not found in table "${tableName}".`);
                releaseLock(tableName);
                return;
            }

            keyValuePairs.forEach(pair => {
                const [key, value] = pair.split('=');
                record[key] = value;
            });

            saveTable(tableName, tableData, (err) => {
                if (err) {
                    console.error('Error saving table data', err);
                } else {
                    console.log(`Updated object with id "${id}" in table "${tableName}".`);
                }
                releaseLock(tableName);
            });
        });
    },

    delete: (tableName, id) => {
        if (isInTransaction) {
            if (!transactionData[tableName]) {
                transactionData[tableName] = { inserts: [], updates: [], deletes: [] };
            }

            transactionData[tableName].deletes.push(id);

            console.log(`Recorded delete of object with id "${id}" from table "${tableName}" in the transaction.`);
            return;
        }

        acquireLock(tableName);

        loadTable(tableName, (err, tableData) => {
            if (err) {
                console.error('Error loading table data', err);
                return;
            }

            const index = tableData.records.findIndex(record => record.id === id);
            if (index === -1) {
                console.log(`Record with id "${id}" not found in table "${tableName}".`);
                releaseLock(tableName);
                return;
            }

            tableData.records.splice(index, 1);

            saveTable(tableName, tableData, (err) => {
                if (err) {
                    console.error('Error saving table data', err);
                } else {
                    console.log(`Deleted object with id "${id}" from table "${tableName}".`);
                }
                releaseLock(tableName);
            });
        });
    },

    read: (tableName) => {
        loadTable(tableName, (err, tableData) => {
            if (err) {
                console.error('Error loading table data', err);
            } else {
                console.log(`Contents of table "${tableName}":`, tableData.records);
            }
        });
    },

    startTransaction: () => {
        if (isInTransaction) {
            console.log('Transaction already in progress.');
            return;
        }
        isInTransaction = true;
        transactionData = {};
        console.log('Transaction started.');
    },

    commitTransaction: () => {
        if (!isInTransaction) {
            console.log('No transaction in progress.');
            return;
        }

        Object.entries(transactionData).forEach(([tableName, { inserts, updates, deletes }]) => {
            if (!fs.existsSync(getTablePath(tableName))) {
                console.log(`Table "${tableName}" does not exist.`);
                return;
            }

            loadTable(tableName, (err, tableData) => {
                if (err) {
                    console.error('Error loading table data', err);
                    return;
                }

                // Apply deletions
                deletes.forEach(id => {
                    const index = tableData.records.findIndex(record => record.id === id);
                    if (index !== -1) {
                        tableData.records.splice(index, 1);
                    }
                });

                // Apply updates
                updates.forEach(({ id, updates }) => {
                    const record = tableData.records.find(record => record.id === id);
                    if (record) {
                        Object.assign(record, updates);
                    }
                });

                // Apply insertions
                tableData.records = tableData.records.concat(inserts);

                saveTable(tableName, tableData, (err) => {
                    if (err) {
                        console.error('Error saving table data', err);
                    }
                });
            });
        });

        console.log('Transaction committed.');
        isInTransaction = false;
        transactionData = {};
    },

    rollbackTransaction: () => {
        if (!isInTransaction) {
            console.log('No transaction in progress.');
            return;
        }

        // Reset transaction data without applying changes
        console.log('Transaction rolled back.');
        isInTransaction = false;
        transactionData = {};
    },

    backupDB: () => {
        const backupPath = path.join(__dirname, 'backup');
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath);
        }

        fs.readdir(dbDir, (err, files) => {
            if (err) {
                console.error('Error reading database directory', err);
                return;
            }

            files.forEach(file => {
                const filePath = path.join(dbDir, file);
                const backupFilePath = path.join(backupPath, file);
                fs.copyFile(filePath, backupFilePath, (err) => {
                    if (err) {
                        console.error('Error backing up file', err);
                    }
                });
            });

            console.log('Database backed up.');
        });
    },

    restoreDB: () => {
        const backupPath = path.join(__dirname, 'backup');
        if (!fs.existsSync(backupPath)) {
            console.log('No backup found.');
            return;
        }

        fs.readdir(backupPath, (err, files) => {
            if (err) {
                console.error('Error reading backup directory', err);
                return;
            }

            files.forEach(file => {
                const backupFilePath = path.join(backupPath, file);
                const filePath = path.join(dbDir, file);
                fs.copyFile(backupFilePath, filePath, (err) => {
                    if (err) {
                        console.error('Error restoring file', err);
                    }
                });
            });

            console.log('Database restored from backup.');
        });
    },

    restorePart: (tableName) => {
        const backupPath = path.join(__dirname, 'backup', `${tableName}.json`);
        const tablePath = getTablePath(tableName);

        if (!fs.existsSync(backupPath)) {
            console.log(`No backup found for table "${tableName}".`);
            return;
        }

        fs.copyFile(backupPath, tablePath, (err) => {
            if (err) {
                console.error('Error restoring table', err);
            } else {
                console.log(`Table "${tableName}" restored from backup.`);
            }
        });
    }
};

// Read input from the console and execute the corresponding function
rl.on('line', (input) => {
    const [command, tableName, ...args] = input.split(' ');
    if (functions[command]) {
        functions[command](tableName, ...args);
    } else {
        console.log(`Unknown command: ${command}`);
    }
});
