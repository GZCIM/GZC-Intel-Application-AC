#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "pg";

const server = new Server(
    {
        name: "postgres-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

let client = null;
const ONE_SHOT = process.env.MCP_ONE_SHOT === "1";

async function shutdown(code = 0) {
    try {
        if (client) {
            await client.end().catch(() => {});
        }
    } catch (_) {}
    // Give stdout/stderr a tick to flush
    setTimeout(() => process.exit(code), 0);
}

// Initialize database connection
async function initConnection() {
    if (!client) {
        const connectionString =
            process.env.POSTGRES_CONNECTION_STRING ||
            "postgresql://mikael:Ii89rra137+*@gzcdevserver.postgres.database.azure.com:5432/gzc_platform?sslmode=require";

        client = new Client({
            connectionString: connectionString,
        });

        try {
            await client.connect();
            console.error("Connected to PostgreSQL database");
        } catch (error) {
            console.error("Failed to connect to database:", error.message);
            client = null;
        }
    }
    return client;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    const res = {
        tools: [
            {
                name: "query_database",
                description: "Execute a SQL query on the PostgreSQL database",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "SQL query to execute",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "list_tables",
                description: "List all tables in the database",
                inputSchema: {
                    type: "object",
                    properties: {
                        schema: {
                            type: "string",
                            description: "Schema name (default: public)",
                            default: "public",
                        },
                    },
                },
            },
            {
                name: "describe_table",
                description: "Get table structure and column information",
                inputSchema: {
                    type: "object",
                    properties: {
                        table_name: {
                            type: "string",
                            description: "Name of the table to describe",
                        },
                        schema: {
                            type: "string",
                            description: "Schema name (default: public)",
                            default: "public",
                        },
                    },
                    required: ["table_name"],
                },
            },
            {
                name: "get_table_data",
                description: "Get sample data from a table",
                inputSchema: {
                    type: "object",
                    properties: {
                        table_name: {
                            type: "string",
                            description: "Name of the table",
                        },
                        schema: {
                            type: "string",
                            description: "Schema name (default: public)",
                            default: "public",
                        },
                        limit: {
                            type: "number",
                            description:
                                "Number of rows to return (default: 10)",
                            default: 10,
                        },
                    },
                    required: ["table_name"],
                },
            },
        ],
    };
    if (ONE_SHOT) {
        // Exit shortly after responding when used as a one-off CLI
        setTimeout(() => shutdown(0), 10);
    }
    return res;
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        const dbClient = await initConnection();
        if (!dbClient) {
            throw new Error("Database connection not available");
        }

        switch (name) {
            case "query_database": {
                const { query } = args;
                const result = await dbClient.query(query);
                const res = {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    rows: result.rows,
                                    rowCount: result.rowCount,
                                    fields: result.fields?.map((f) => ({
                                        name: f.name,
                                        dataTypeID: f.dataTypeID,
                                    })),
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
                if (ONE_SHOT) setTimeout(() => shutdown(0), 10);
                return res;
            }

            case "list_tables": {
                const { schema = "public" } = args;
                const query = `
          SELECT table_name, table_type
          FROM information_schema.tables
          WHERE table_schema = $1
          ORDER BY table_name;
        `;
                const result = await dbClient.query(query, [schema]);
                const res = {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.rows, null, 2),
                        },
                    ],
                };
                if (ONE_SHOT) setTimeout(() => shutdown(0), 10);
                return res;
            }

            case "describe_table": {
                const { table_name, schema = "public" } = args;
                const query = `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
        `;
                const result = await dbClient.query(query, [
                    schema,
                    table_name,
                ]);
                const res = {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.rows, null, 2),
                        },
                    ],
                };
                if (ONE_SHOT) setTimeout(() => shutdown(0), 10);
                return res;
            }

            case "get_table_data": {
                const { table_name, schema = "public", limit = 10 } = args;
                const query = `SELECT * FROM "${schema}"."${table_name}" LIMIT $1;`;
                const result = await dbClient.query(query, [limit]);
                const res = {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.rows, null, 2),
                        },
                    ],
                };
                if (ONE_SHOT) setTimeout(() => shutdown(0), 10);
                return res;
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const res = {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
        if (ONE_SHOT) setTimeout(() => shutdown(1), 10);
        return res;
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("PostgreSQL MCP Server running");

    // Gracefully exit when stdin closes (common for one-off CLI use)
    if (!process.stdin.isTTY) {
        process.stdin.on("end", () => shutdown(0));
        // Safety idle timeout for pipelines that don't close stdin
        const idleMs = Number(process.env.MCP_IDLE_EXIT_MS || 2000);
        let idleTimer = setTimeout(() => shutdown(0), idleMs);
        process.stdin.on("data", () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => shutdown(0), idleMs);
        });
    }

    ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"].forEach((sig) =>
        process.on(sig, () => shutdown(0))
    );
}

main().catch(console.error);
