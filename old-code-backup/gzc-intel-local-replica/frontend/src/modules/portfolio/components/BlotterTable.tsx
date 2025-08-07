import React, { useEffect, useState } from "react";
import { useTransactionsData } from "../hooks/useTransactionsData";
import { DataTable, ContextMenu } from "../../ui-library";
import type { Transaction } from "../types/transaction";
import type { ColumnDef } from "@tanstack/react-table";
import { quantumTheme } from "../../../theme/quantum";

const BlotterTable: React.FC = () => {
    const { transactions, isLoading } = useTransactionsData();
    const [showTable, setShowTable] = useState(true);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        value: Transaction[keyof Transaction] | null;
        row: Transaction;
    } | null>(null);

    useEffect(() => {
        const hideMenu = () => setContextMenu(null);
        window.addEventListener("click", hideMenu);
        return () => window.removeEventListener("click", hideMenu);
    }, []);

    const handleRightClick = (
        e: React.MouseEvent,
        value: Transaction[keyof Transaction],
        row: Transaction
    ) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            value,
            row,
        });
    };
    const handleToggle = () => setShowTable((prev) => !prev);
    if (transactions.length === 0) return null;

    const columns: ColumnDef<Transaction>[] = [
        { accessorKey: "id", header: "Transaction ID" },
        { accessorKey: "symbol", header: "Symbol" },
        { accessorKey: "side", header: "Side" },
        { accessorKey: "quantity", header: "Quantity" },
        { accessorKey: "price", header: "Price" },
        { accessorKey: "tradeDate", header: "Trade Date" },
        { accessorKey: "status", header: "Status" },
    ];

    return (
        <div style={{ 
            padding: quantumTheme.spacing.lg,
            position: 'relative',
            marginTop: quantumTheme.spacing.xxl,
            backgroundColor: quantumTheme.background
        }}>
            <h2
                style={{
                    ...quantumTheme.typography.h1,
                    color: quantumTheme.text,
                    marginBottom: quantumTheme.spacing.lg,
                    cursor: 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: quantumTheme.spacing.sm
                }}
                onClick={handleToggle}
            >
                <span style={{ 
                    fontFamily: 'monospace',
                    color: quantumTheme.primary
                }}>{showTable ? "-" : "+"}</span> Pending Transactions
            </h2>
            {showTable && (
                <DataTable
                    data={transactions}
                    columns={columns}
                    isLoading={isLoading}
                    onCellRightClick={handleRightClick}
                />
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                >
                    <ContextMenu.Item
                        onClick={() =>
                            alert(
                                `Inspecting transaction: ${contextMenu.value}`
                            )
                        }
                    >
                        🔍 Inspect
                    </ContextMenu.Item>
                    <ContextMenu.Submenu label="⚙️ Actions">
                        <ContextMenu.Item
                            onClick={() =>
                                alert(`Mark as matched: ${contextMenu.row.id}`)
                            }
                        >
                            ✅ Mark Matched
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={() =>
                                alert(`Flag transaction ${contextMenu.row.id}`)
                            }
                        >
                            🚩 Flag
                        </ContextMenu.Item>
                    </ContextMenu.Submenu>
                    <ContextMenu.Item
                        onClick={() =>
                            alert(`Delete transaction ${contextMenu.row.id}`)
                        }
                    >
                        ❌ Remove
                    </ContextMenu.Item>
                </ContextMenu>
            )}
        </div>
    );
};

export default BlotterTable;
