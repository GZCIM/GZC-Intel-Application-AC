/// <reference types="react" />
import React from "react";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
    data: TData[];
    columns: ColumnDef<TData, TValue>[];
    isLoading?: boolean;
    onCellRightClick?: (
        event: React.MouseEvent<HTMLTableCellElement>,
        cellValue: TValue,
        rowData: TData
    ) => void;
}

export function DataTable<TData, TValue>({
    data,
    columns,
    isLoading,
    onCellRightClick,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
    });

    if (isLoading) {
        return <div className="text-center py-10">Loading...</div>;
    }

    return (
        <div className="overflow-x-auto rounded-md border dark:border-gray-700">
            <table className="min-w-full text-sm text-left text-gray-900 dark:text-white">
                <thead className="bg-gray-100 text-black dark:bg-gray-800 dark:text-white">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="cursor-pointer px-4 py-2 font-semibold hover:underline"
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {header.column.getIsSorted() === "asc" &&
                                        " ↑"}
                                    {header.column.getIsSorted() === "desc" &&
                                        " ↓"}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className="border-t last:border-b dark:border-gray-700"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className="px-4 py-2"
                                    onContextMenu={(
                                        e: React.MouseEvent<HTMLTableCellElement>
                                    ) =>
                                        onCellRightClick?.(
                                            e,
                                            cell.getValue() as TValue,
                                            row.original
                                        )
                                    }
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
