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
exports.SqliteGuiNode = SqliteGuiNode;
exports.createSqliteGuiApp = createSqliteGuiApp;
exports.SqliteGuiNodeMiddleware = SqliteGuiNodeMiddleware;
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const databaseFunctions = require("./Utils/databaseFunctions").default;
const logger = require("./Utils/logger").default;
const tableRoutes = require("./routes/tables").default;
const app = express();
const openApiDocument = {
    openapi: "3.0.3",
    info: {
        title: "sqlite-gui-node API",
        version: "1.0.0",
        description: "RESTful API for sqlite-gui-node",
    },
    servers: [{ url: "/", description: "Current server" }],
    paths: {
        "/api/tables": {
            get: {
                summary: "List all tables",
                responses: { "200": { description: "Tables fetched" } },
            },
        },
        "/api/tables/{name}/rows": {
            get: {
                summary: "Get rows from a table",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                    { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
                    { name: "perPage", in: "query", required: false, schema: { type: "integer", default: 50 } },
                ],
                responses: { "200": { description: "Rows fetched" } },
            },
            post: {
                summary: "Insert a row into a table",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: { "201": { description: "Row inserted" } },
            },
        },
        "/api/tables/{name}/rows/{id}": {
            get: {
                summary: "Get a row by id/key",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                    { name: "key", in: "query", required: false, schema: { type: "string", default: "id" } },
                ],
                responses: { "200": { description: "Row fetched" } },
            },
            patch: {
                summary: "Update a row by id/key",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                    { name: "key", in: "query", required: false, schema: { type: "string", default: "id" } },
                ],
                responses: { "200": { description: "Row updated" } },
            },
            delete: {
                summary: "Delete a row by id/key",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                    { name: "key", in: "query", required: false, schema: { type: "string", default: "id" } },
                ],
                responses: { "200": { description: "Row deleted" } },
            },
        },
        "/api/tables/{name}": {
            delete: {
                summary: "Delete a table",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "Table deleted" } },
            },
        },
        "/api/tables/{name}/columns": {
            get: {
                summary: "Get table columns",
                parameters: [
                    { name: "name", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: { "200": { description: "Columns fetched" } },
            },
        },
    },
};
function configureAppRoutes(targetApp, db) {
    targetApp.use("/api/tables", tableRoutes(db));
    targetApp.get("/api-docs.json", (_req, res) => {
        res.status(200).json(openApiDocument);
    });
    targetApp.get("/api-docs", (_req, res) => {
        res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>sqlite-gui-node API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: './api-docs.json',
        dom_id: '#swagger-ui'
      });
    </script>
  </body>
</html>`);
    });
}
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.locals.basePath = req.baseUrl;
    next();
});
// Routes
app.get("/query", (_req, res) => {
    res.render("query", { title: "Query Page" });
});
app.get("/home", (_req, res) => {
    res.render("index", { title: "Home Page" });
});
app.get("/createtable", (_req, res) => {
    res.render("createTable", { title: "Create Table Page" });
});
app.get("/insert/:table", (req, res) => {
    const tableName = req.params.table;
    res.render("insert", { tableName });
});
app.get("/edit/:table/:label/:id", (req, res) => {
    const tableName = req.params.table;
    const id = req.params.id;
    res.render("edit", { tableName, id });
});
// SqliteGuiNode function to run the app
function SqliteGuiNode(db_1) {
    return __awaiter(this, arguments, void 0, function* (db, port = 8080) {
        yield databaseFunctions.InitializeDB(db);
        configureAppRoutes(app, db);
        app.listen(port, () => {
            logger.info(`SQLite Web Admin Tool running at http://localhost:${port}/home`);
        });
    });
}
function createSqliteGuiApp(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield databaseFunctions.InitializeDB(db);
        configureAppRoutes(app, db);
        return app;
    });
}
// SqliteGuiNode as middleware
function SqliteGuiNodeMiddleware(app, db) {
    return function (_req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield databaseFunctions.InitializeDB(db);
                app.set("view engine", "ejs");
                app.set("views", path.join(__dirname, "../views"));
                app.use(bodyParser.urlencoded({ extended: false }));
                app.use(express.static(path.join(__dirname, "../public")));
                app.use(bodyParser.json());
                // Routes
                app.get("/query", (_req, res) => {
                    res.render("query", { title: "Query Page" });
                });
                app.get("/", (_req, res) => {
                    res.render("index", { title: "Home Page" });
                });
                app.get("/createtable", (_req, res) => {
                    res.render("createTable", { title: "Create Table Page" });
                });
                app.get("/insert/:table", (req, res) => {
                    const tableName = req.params.table;
                    res.render("insert", { tableName });
                });
                app.get("/edit/:table/:label/:id", (req, res) => {
                    const tableName = req.params.table;
                    const id = req.params.id;
                    res.render("edit", { tableName, id });
                });
                configureAppRoutes(app, db);
                app.get("/home", (_req, res) => {
                    res.render("index", { title: "Home Page" });
                });
                next();
            }
            catch (error) {
                logger.error("Error initializing the database:", error);
                res.status(500).send("Error initializing the database.");
            }
        });
    };
}
