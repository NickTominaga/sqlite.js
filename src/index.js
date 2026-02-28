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
    "/api/tables": { get: { summary: "List all tables" } },
    "/api/tables/{name}/rows": { get: { summary: "Get rows" }, post: { summary: "Insert row" } },
    "/api/tables/{name}/rows/{id}": { get: { summary: "Get row" }, patch: { summary: "Update row" }, delete: { summary: "Delete row" } },
    "/api/tables/{name}": { delete: { summary: "Delete table" } },
  },
};

function setupCore(targetApp) {
  targetApp.use(bodyParser.urlencoded({ extended: false }));
  targetApp.use(bodyParser.json());
  targetApp.use(express.static(path.join(__dirname, "../public")));
}

function setupPageRoutes(targetApp) {
  const send = (res, file) => res.sendFile(path.join(__dirname, "../public", file));

  targetApp.get(["/", "/home"], (_req, res) => send(res, "home.html"));
  targetApp.get("/query", (_req, res) => send(res, "query.html"));
  targetApp.get("/createtable", (_req, res) => send(res, "createTable.html"));
  targetApp.get("/insert/:table", (_req, res) => send(res, "insert.html"));
  targetApp.get("/edit/:table/:label/:id", (_req, res) => send(res, "edit.html"));
}

function setupApiRoutes(targetApp, db) {
  targetApp.use("/api/tables", tableRoutes(db));
  targetApp.get("/api-docs.json", (_req, res) => res.status(200).json(openApiDocument));
  targetApp.get("/api-docs", (_req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>sqlite-gui-node API Docs</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" /></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'./api-docs.json',dom_id:'#swagger-ui'});</script></body></html>`);
  });
}

function configureAppRoutes(targetApp, db) {
  setupCore(targetApp);
  setupPageRoutes(targetApp);
  setupApiRoutes(targetApp, db);
}

async function SqliteGuiNode(db, port = 8080) {
  await databaseFunctions.InitializeDB(db);
  configureAppRoutes(app, db);
  app.listen(port, () => {
    logger.info(`SQLite Web Admin Tool running at http://localhost:${port}/home`);
  });
}

async function createSqliteGuiApp(db) {
  await databaseFunctions.InitializeDB(db);
  configureAppRoutes(app, db);
  return app;
}

function SqliteGuiNodeMiddleware(targetApp, db) {
  return async function (_req, res, next) {
    try {
      await databaseFunctions.InitializeDB(db);
      configureAppRoutes(targetApp, db);
      next();
    } catch (error) {
      logger.error("Error initializing the database:", error);
      res.status(500).send("Error initializing the database.");
    }
  };
}

module.exports = { SqliteGuiNode, createSqliteGuiApp, SqliteGuiNodeMiddleware };
