"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger = require("./logger").default; // Assuming logger is imported from a separate file
const fs = require("fs");
const path = require("path");
const { quoteColumn: q } = require("./helpers");
function InitializeDB(db) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='query'", (err, row) => {
                    if (err) {
                        logger.error("Error checking for query:", err.message);
                        reject(err);
                        return;
                    }
                    if (!row || row === undefined) {
                        db.run(`
              CREATE TABLE IF NOT EXISTS query (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                sqlstatement TEXT
              )
            `, (err) => {
                            if (err) {
                                logger.error("Error creating query:", err.message);
                                reject(err);
                                return;
                            }
                            resolve(); // No error, table created successfully
                        });
                    }
                    else {
                        resolve(); // No error, table already exists
                    }
                });
            });
        });
    });
}
function insertQuery(db, name, sqlStatement) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO query (name, sqlstatement) VALUES (?, ?)`, [name, sqlStatement], (error) => {
            if (error) {
                logger.error("SQL Statement : " + sqlStatement);
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true });
            }
        });
    });
}
function fetchQueries(db) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM query`, function (error, rows) {
            if (error) {
                logger.error("Error while fetching table");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true, data: rows });
            }
        });
    });
}
function fetchAllTables(db) {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", function (error, rows) {
            if (error) {
                logger.error("Error while fetching tables");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true, data: rows });
            }
        });
    });
}
function fetchTable(db_1, table_1) {
    return __awaiter(this, arguments, void 0, function* (db, table, pagination = { page: 1, perPage: 50 }) {
        const page = pagination.page;
        const limit = pagination.perPage;
        const offset = (page - 1) * limit;
        const [rows, total] = yield Promise.all([
            new Promise((resolve, reject) => {
                db.all(`SELECT * FROM ${q(table)} LIMIT ${limit} OFFSET ${offset}`, function (error, rows) {
                    if (error) {
                        logger.error("Error while fetching table");
                        logger.error(error.message);
                        reject({ bool: false, error: error.message });
                        return;
                    }
                    else {
                        resolve(rows);
                    }
                });
            }),
            new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) FROM ${q(table)};`, function (error, res) {
                    var _a;
                    if (error) {
                        logger.error("Error while fetching table");
                        logger.error(error.message);
                        reject({ bool: false, error: error.message });
                        return;
                    }
                    else {
                        resolve((_a = Object.values(res)[0]) !== null && _a !== void 0 ? _a : 0);
                    }
                });
            }),
        ]);
        return {
            bool: true,
            data: rows || [],
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(Number(total) / limit)
            }
        };
    });
}
function fetchRecord(db, table, label, id) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${q(table)} WHERE ${label} = ${typeof id === "string" ? `'${id}'` : id}`, function (error, rows) {
            if (error) {
                logger.error("Error while fetching record");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true, data: rows });
            }
        });
    });
}
function fetchTableInfo(db, table) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${q(table)})`, function (error, rows) {
            if (error) {
                logger.error("Error while fetching table info");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
            }
            else {
                // Filter out the auto-increment column
                // const filteredColumns = rows.filter(
                //   (row: any) =>
                //     !(
                //       (row.pk > 0 && row.type.toUpperCase() === "INTEGER") ||
                //       row.type.toUpperCase() === "DATETIME"
                //     )
                // );
                // Map the remaining columns to an array of column objects with name and type
                const tableInfo = rows.map((row) => ({
                    field: row.name,
                    type: row.type,
                }));
                if (tableInfo.length === 0) {
                    reject({
                        bool: false,
                        error: "No columns to select (all columns are auto-increment).",
                    });
                }
                else {
                    resolve({ bool: true, data: tableInfo });
                }
            }
        });
    });
}
function fetchAllTableInfo(db, table) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${q(table)})`, function (error, rows) {
            if (error) {
                logger.error("Error while fetching table info");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
            }
            else {
                // Map the columns to an array of column objects with name and type
                const tableInfo = rows.map((row) => ({
                    field: row.name,
                    type: row.type,
                }));
                if (tableInfo.length === 0) {
                    reject({
                        bool: false,
                        error: "No columns to select (all columns are auto-increment).",
                    });
                }
                else {
                    resolve({ bool: true, data: tableInfo });
                }
            }
        });
    });
}
// Function to fetch foreign key info of a table
function fetchTableForeignKeys(db, table) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            db.all(`PRAGMA foreign_key_list(${q(table)})`, function (error, rows) {
                if (error) {
                    console.error("Error while fetching foreign key info");
                    console.error(error.message);
                    reject({ bool: false, error: error.message });
                }
                else {
                    if (rows.length === 0) {
                        resolve({ bool: false, data: [] });
                    }
                    else {
                        const foreignKeys = rows.map((row) => ({
                            table: row.table,
                            from: row.from,
                            to: row.to,
                        }));
                        resolve({ bool: true, data: foreignKeys });
                    }
                }
            });
        });
    });
}
function fetchFK(db, table, column) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ${q(column)} from ${q(table)}`, function (error, rows) {
            if (error) {
                logger.error("Error while fetching Foreign keys");
                logger.error(error.message);
                reject({ bool: false, data: [], error: error.message });
                return;
            }
            else {
                resolve({ bool: true, data: rows });
            }
        });
    });
}
function runQuery(db, sqlStatement) {
    return new Promise((resolve, reject) => {
        db.run(sqlStatement, function (error) {
            if (error) {
                logger.error("SQL Statement : " + sqlStatement);
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true });
            }
        });
    });
}
function runSelectQuery(db, sqlStatement) {
    return new Promise((resolve, reject) => {
        db.all(sqlStatement, function (error, rows) {
            if (error) {
                logger.error("SQL Statement : " + sqlStatement);
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true, data: rows });
            }
        });
    });
}
function checkColumnHasDefault(db, tableName, columnType, columnName) {
    return new Promise((resolve, reject) => {
        try {
            // Construct the SQL query to check if the column has a default value
            const sql = `
                SELECT sql
                FROM sqlite_master
                WHERE type = 'table' AND name = '${q(tableName)}'
            `;
            // Execute the SQL query
            db.get(sql, [], (err, row) => {
                if (err) {
                    reject({
                        bool: false,
                        message: "Error while executing query",
                        error: err.message,
                    });
                    return;
                }
                if (!row) {
                    resolve({ bool: false, message: "Table not found" });
                    return;
                }
                // Check if the SQL definition contains the column name and the word "DEFAULT"
                const hasDefault = row.sql.includes(`${q(columnName)} ${columnType} DEFAULT`);
                // Return the result
                resolve({ bool: hasDefault, message: "" });
            });
        }
        catch (error) {
            reject({
                bool: false,
                message: "Error while executing query",
                error: error.message,
            });
        }
    });
}
function deleteFromTable(db, name, id) {
    // console.log(sqlStatement);
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM ${name} WHERE id = ${typeof id === "string" ? `'${id}'` : id};`, function (error) {
            if (error) {
                logger.error("Error while deleting");
                logger.error(error.message);
                reject({ bool: false, error: error.message });
                return;
            }
            else {
                resolve({ bool: true });
            }
        });
    });
}
function exportDatabaseToSQL(db) {
    return new Promise((resolve, reject) => {
        const outputPath = path.resolve(__dirname, "..", "..", "public", "output.sql");
        let sql = "";
        db.serialize(() => {
            db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
                if (err) {
                    reject({ bool: false, error: err.message });
                    return;
                }
                let pendingTables = tables.length;
                tables.forEach((table) => {
                    const tableName = table.name;
                    const createTableSQL = table.sql;
                    sql += `-- Dumping data for table ${q(tableName)}\n`;
                    sql += `${createTableSQL};\n`;
                    db.all(`PRAGMA table_info(${q(tableName)})`, (err, columns) => {
                        if (err) {
                            reject({ bool: false, error: err.message });
                            return;
                        }
                        columns.forEach((column) => {
                            sql += `-- ${column.cid} | ${column.name} | ${column.type} | ${column.notnull} | ${column.dflt_value} | ${column.pk}\n`;
                        });
                        db.all(`SELECT * FROM ${q(tableName)}`, (err, rows) => {
                            if (err) {
                                reject({ bool: false, error: err.message });
                                return;
                            }
                            rows.forEach((row) => {
                                const columns = Object.keys(row).map(q).join(", ");
                                const values = Object.values(row)
                                    .map((value) => `'${value}'`)
                                    .join(", ");
                                sql += `INSERT INTO ${q(tableName)} (${columns}) VALUES (${values});\n`;
                            });
                            pendingTables -= 1;
                            if (pendingTables === 0) {
                                fs.writeFile(outputPath, sql, (err) => {
                                    if (err) {
                                        reject({ bool: false, error: err.message });
                                        return;
                                    }
                                    resolve({ bool: true, filePath: outputPath });
                                });
                            }
                        });
                    });
                });
            });
        });
    });
}
exports.default = {
    checkColumnHasDefault,
    fetchAllTables,
    fetchTable,
    fetchTableInfo,
    fetchAllTableInfo,
    deleteFromTable,
    fetchRecord,
    runQuery,
    runSelectQuery,
    InitializeDB,
    insertQuery,
    fetchQueries,
    fetchTableForeignKeys,
    fetchFK,
    exportDatabaseToSQL,
};
