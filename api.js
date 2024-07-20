const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Define the path to the database directory
const dbDir = path.join(__dirname, 'db');

// Helper function to get the path of a table file
const getTablePath = (tableName) => path.join(dbDir, `${tableName}.json`);

// Route to read records from a specified table
app.get('/api/records/:tableName', (req, res) => {
    const tableName = req.params.tableName;
    const tablePath = getTablePath(tableName);

    fs.readFile(tablePath, 'utf8', (err, data) => {
        if (err) {
            // Handle file read errors (e.g., file not found)
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: `Table "${tableName}" not found` });
            }
            console.error('Error reading the table file', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        try {
            const tableData = JSON.parse(data);
            res.json(tableData.records);
        } catch (parseErr) {
            console.error('Error parsing the table data', parseErr);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Avvio del server e intestazione
    console.log(`
**********************************************************
*                                                        *
*              Simple DB CLI API Server                 *
*                                                        *
*       Server is running on http://localhost:${port}    *
*       Ready to handle requests for JSON table data.    *
*                                                        *
*   Example request to read records from a table:        *
*   curl http://localhost:${port}/records/utenti          *
*                                                        *
*   Make sure to place your JSON tables in the 'db'      *
*   directory with the correct format.                   *
*                                                        *
**********************************************************
    `);

