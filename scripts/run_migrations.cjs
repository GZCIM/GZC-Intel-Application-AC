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

    const files = [
        path.join("migrations", "002_create_fx_lineage_tables.sql"),
        path.join("migrations", "003_create_portfolio_and_allocations.sql"),
    ];

    for (const f of files) {
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

