import express, { Request, Response } from "express";
import databaseFunctions from "../Utils/databaseFunctions";
import sqlGenerator from "../Utils/sqlGenerator";
import { quoteColumn as q } from "../Utils/helpers";
import type { Database } from "sqlite3";

const router = express.Router();

function parsePagination(query: Request["query"]) {
  const page = Number(query.page) || 1;
  const perPage = Number(query.perPage) || 50;
  return { page, perPage };
}

function tableRoutes(db: Database) {
  router.get("/", async (_req: Request, res: Response) => {
    try {
      await databaseFunctions.exportDatabaseToSQL(db);
      const tables = await databaseFunctions.fetchAllTables(db);
      res.status(200).json(tables);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/local/query", async (_req: Request, res: Response) => {
    try {
      await databaseFunctions.InitializeDB(db);
      const queries = await databaseFunctions.fetchQueries(db);
      res.status(200).json(queries);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/local/query", async (req: Request, res: Response) => {
    try {
      await databaseFunctions.InitializeDB(db);
      const { name, sqlStatement } = req.body;
      const response = await databaseFunctions.insertQuery(
        db,
        name,
        sqlStatement
      );
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // RESTful routes
  router.get("/:name/rows", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const response = await databaseFunctions.fetchTable(
        db,
        name,
        parsePagination(req.query)
      );
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/:name/rows/:id", async (req: Request, res: Response) => {
    try {
      const { name, id } = req.params;
      const key = String(req.query.key ?? "id");
      const response = await databaseFunctions.fetchRecord(db, name, key, id);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/:name/rows", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { dataArray } = req.body;
      const sql = await sqlGenerator.generateInsertSQL(db, name, dataArray);
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(201).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.patch("/:name/rows/:id", async (req: Request, res: Response) => {
    try {
      const { name, id } = req.params;
      const { dataArray, id_label } = req.body;
      const key = id_label ?? String(req.query.key ?? "id");
      const sql = sqlGenerator.generateUpdateSQL(name, dataArray, id, key);
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/:name/rows/:id", async (req: Request, res: Response) => {
    try {
      const { name, id } = req.params;
      const key = String(req.query.key ?? "id");
      const sql = `DELETE FROM ${q(name)} WHERE ${q(key)} = ${
        Number.isNaN(Number(id)) ? `'${id}'` : Number(id)
      };`;
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.delete("/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const sql = `DROP TABLE ${q(name)};`;
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/:name/columns", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const response = await databaseFunctions.fetchTableInfo(db, name);
      const fk = await databaseFunctions.fetchTableForeignKeys(db, name);
      if (fk.bool && fk.data !== undefined) {
        await Promise.all(
          fk.data.map(async (element) => {
            const fkResponse = await databaseFunctions.fetchFK(
              db,
              element.table,
              element.to
            );
            if (response.data !== undefined) {
              response.data.forEach((item) => {
                if (item.field === element.from) {
                  item.fk = fkResponse.data.map((obj) => obj[element.to]);
                }
              });
            }
          })
        );
      }
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/:name/columns/all", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchAllTableInfo(db, name);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy routes (kept for backward compatibility)
  router.get("/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const response = await databaseFunctions.fetchTable(
        db,
        name,
        parsePagination(req.query)
      );
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/infos/:name", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchTableInfo(db, name);
      const fk = await databaseFunctions.fetchTableForeignKeys(db, name);
      if (fk.bool && fk.data !== undefined) {
        await Promise.all(
          fk.data.map(async (element) => {
            const fkResponse = await databaseFunctions.fetchFK(
              db,
              element.table,
              element.to
            );
            if (response.data !== undefined) {
              response.data.forEach((item) => {
                if (item.field === element.from) {
                  item.fk = fkResponse.data.map((obj) => obj[element.to]);
                }
              });
            }
          })
        );
      }
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/all/infos/:name", async (req: Request, res: Response) => {
    const { name } = req.params;
    try {
      const response = await databaseFunctions.fetchAllTableInfo(db, name);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/insert", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray } = req.body;
      const sql = await sqlGenerator.generateInsertSQL(db, tablename, dataArray);
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/insert", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray } = req.body;
      const sql = await sqlGenerator.generateInsertSQL(db, tablename, dataArray);
      res.status(200).json(sql);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/query", async (req: Request, res: Response) => {
    try {
      const { sqlQuery } = req.body;
      const lowersqlQuery = sqlQuery.toLowerCase();
      if (lowersqlQuery.startsWith("select")) {
        const response = await databaseFunctions.runSelectQuery(db, sqlQuery);
        if (lowersqlQuery.startsWith("select count(*)")) {
          if (response.data !== undefined) {
            res.status(200).json({
              type: "string",
              data: "Count result is " + response.data[0]["count(*)"],
            });
          } else {
            res.status(500).json({
              type: "string",
              data: "Database error",
            });
          }
        } else {
          res.status(200).json({ type: "table", data: response.data });
        }
      } else {
        await databaseFunctions.runQuery(db, sqlQuery);
        let message = "";
        if (lowersqlQuery.startsWith("update")) message = "Updated Successfully";
        if (lowersqlQuery.startsWith("insert")) message = "Inserted Successfully";
        if (lowersqlQuery.startsWith("delete")) message = "Deleted Successfully";
        if (lowersqlQuery.startsWith("create")) message = "Created Successfully";
        res.status(200).json({ type: "string", data: message });
      }
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/create", async (req: Request, res: Response) => {
    try {
      const { tableName, data } = req.body;
      const sql = sqlGenerator.generateCreateTableSQL(tableName, data);
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/create", async (req: Request, res: Response) => {
    try {
      const { tableName, data } = req.body;
      const sql = sqlGenerator.generateCreateTableSQL(tableName, data);
      res.status(200).json(sql);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/update", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray, userId, id_label } = req.body;
      const sql = sqlGenerator.generateUpdateSQL(
        tablename,
        dataArray,
        userId,
        id_label
      );
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/generate/update", async (req: Request, res: Response) => {
    try {
      const { tablename, dataArray, userId, id_label } = req.body;
      const sql = sqlGenerator.generateUpdateSQL(
        tablename,
        dataArray,
        userId,
        id_label
      );
      res.status(200).json(sql);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get(
    "/getrecord/:tablename/:label/:id",
    async (req: Request, res: Response) => {
      try {
        const { tablename, label, id } = req.params;
        const response = await databaseFunctions.fetchRecord(
          db,
          tablename,
          label,
          id
        );
        res.status(200).json(response);
      } catch (_error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.post("/delete", async (req: Request, res: Response) => {
    try {
      const { tablename, id } = req.body;
      const response = await databaseFunctions.deleteFromTable(
        db,
        tablename,
        id
      );
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/table/delete", async (req: Request, res: Response) => {
    try {
      const { tablename } = req.body;
      const sql = `DROP TABLE ${q(tablename)};`;
      const response = await databaseFunctions.runQuery(db, sql);
      res.status(200).json(response);
    } catch (_error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
}

export default tableRoutes;
