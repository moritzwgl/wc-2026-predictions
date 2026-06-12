import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "football.db");
const outDir = path.join(process.cwd(), "data");

const db = new Database(dbPath, { readonly: true });

function exportTable(tableName: string) {
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  const outPath = path.join(outDir, `${tableName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`Exported ${rows.length} rows from ${tableName} to ${tableName}.json`);
}

exportTable("matches");
exportTable("teams");
exportTable("tournaments");
exportTable("venues");

db.close();
console.log("Export complete.");
