// Simple migration runner to execute .sql files against PG using connection string from PGURL env var
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function run() {
    const cs = process.env.PGURL;
    if (!cs) {
        console.error("Missing PGURL env var");
        process.exit(1);
    }
    const client = new Client({ connectionString: cs });
    await client.connect();

    // Discover and run all .sql migrations in alphanumeric order
    const dir = path.join("migrations");
    const files = fs
        .readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const name of files) {
        const f = path.join(dir, name);
        const sql = fs.readFileSync(f, "utf8");
        console.log(`\n-- Running ${f} --`);
        await client.query(sql);
        console.log(`-- Done ${f} --`);
    }

    await client.end();
}

run().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
});
