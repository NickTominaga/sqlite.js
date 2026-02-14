type Request = import("express").Request;
type Response = import("express").Response;
type NextFunction = import("express").NextFunction;
type Application = import("express").Application;
type Database = import("sqlite3").Database;
export declare function SqliteGuiNode(db: Database, port?: number): Promise<void>;
export declare function createSqliteGuiApp(db: Database): Promise<Application>;
export declare function SqliteGuiNodeMiddleware(app: any, db: Database): (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
