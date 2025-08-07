/// <reference types="react" />

import React, { useRef, useEffect } from "react";
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}


interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[160px] text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-md"
            style={{ top: `${y}px`, left: `${x}px` }}
        >
            {children}
        </div>
    );
}

interface ItemProps {
    onClick: () => void;
    children: React.ReactNode;
}

function Item({ onClick, children }: ItemProps) {
    return (
        <div
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onClick();
            }}
            className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
        >
            {children}
        </div>
    );
}

interface SubmenuProps {
    label: React.ReactNode;
    children: React.ReactNode;
}

function Submenu({ label, children }: SubmenuProps) {
    return (
        <div className="relative group">
            <div className="px-3 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                {label}
                <span className="ml-2 text-gray-400">▶</span>
            </div>
            <div className="absolute left-full top-0 mt-[-1px] hidden group-hover:block min-w-[160px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-md z-50">
                {children}
            </div>
        </div>
    );
}

ContextMenu.Item = Item;
ContextMenu.Submenu = Submenu;
