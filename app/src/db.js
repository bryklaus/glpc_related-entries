const waitPort = require('wait-port');
const fs = require('fs');
const mysql = require('mysql2');

const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool;

async function init() {
	const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;
	const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
	const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
	const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;

    await waitPort({ 
        host: HOST,
        port: 3306,
        timeout: 10000,
        waitForDns: true,
    });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
        charset: 'utf8mb4',
    });

    return new Promise((acc, rej) => {
        pool.query(
            'CREATE TABLE IF NOT EXISTS related_entries (id varchar(36), entry_id INT, related_entry_id INT) DEFAULT CHARSET utf8mb4',
            err => {
                if (err) return rej(err);

                console.log(`Connected to mysql db at host ${HOST}`);
                acc();
            },
        );
    });
}

async function teardown() {
	return pool.end();
}

async function getItems() {
    return new Promise((acc, rej) => {
        pool.query('SELECT * FROM related_entries', (err, rows) => {
            if (err) return rej(err);
            acc(rows);
        });
    });
}

async function getItem(id) {
	return new Promise((resolve, reject) => {
		pool.query('SELECT * FROM related_entries WHERE id = ?', [id], (err, rows) => {
			if (err) {
				return reject(err);
			}

			if (rows.length > 0) {
				return resolve(rows[0]); // Retrieve the first row
			}

			return resolve(null); // Return null if no rows found
		});
	});
}

async function getItemsByEntryId(entryId) {
	return new Promise((acc, rej) => {
		pool.query(
			'SELECT * FROM related_entries WHERE entry_id = ?', [entryId], (err, rows) => {
				if (err) return rej(err);
				acc(rows);
			}
		);
	});
}

async function removeItem(id) {
    return new Promise((acc, rej) => {
        pool.query('DELETE FROM related_entries WHERE id = ?', [id], err => {
            if (err) return rej(err);
            acc();
        });
    });
}

async function matchItem(entryId, relatedEntryId) {
	return new Promise((acc, rej) => {
		pool.query(
			'SELECT * FROM related_entries WHERE entry_id = ? AND related_entry_id = ?',
			[relatedEntryId, entryId],
			(err, rows) => {
				if (err) return rej(err);
					if (rows.length > 0) {
						acc(rows[0]);
					} else {
						acc(null);
					}
			},
		);
	});
}

async function storeItem(item) {
    return new Promise((acc, rej) => {
        pool.query(
            'INSERT INTO related_entries (id, entry_id, related_entry_id) VALUES (?, ?, ?)',
            [item.id, item.entry_id, item.related_entry_id],
            err => {
                if (err) return rej(err);
                acc();
            },
        );
    });
}

module.exports = {
    init,
    teardown,
    getItems,
    getItem,
    getItemsByEntryId,
    removeItem,
    matchItem,
    storeItem,
    pool
};
