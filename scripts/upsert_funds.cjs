#!/usr/bin/env node
const { Client } = require("pg");

(async () => {
    const connectionString =
        "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require";
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const upsertOne = async (id) => {
            await client.query(
                'INSERT INTO public.gzc_fund ("Id","FundNameShort","FundNameFull","mod_user","mod_timestamp") ' +
                    'SELECT "FundId","FundNameShort","FundNameFull", $1, NOW() FROM leg."tblFund" WHERE "FundId" = $2 ' +
                    'ON CONFLICT ("Id") DO UPDATE SET "FundNameShort"=EXCLUDED."FundNameShort","FundNameFull"=EXCLUDED."FundNameFull","mod_user"=EXCLUDED."mod_user","mod_timestamp"=EXCLUDED."mod_timestamp"',
                ["GZC", id]
            );
        };
        await upsertOne(1);
        await upsertOne(6);
        const res = await client.query(
            'SELECT "Id","FundNameShort","FundNameFull" FROM public.gzc_fund WHERE "Id" IN (1,6) ORDER BY "Id"'
        );
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
})();


