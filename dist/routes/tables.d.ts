type Database = import("sqlite3").Database;
declare function tableRoutes(db: Database): import("express-serve-static-core").Router;
export default tableRoutes;
