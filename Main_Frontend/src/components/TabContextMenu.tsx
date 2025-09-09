import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { useTabLayout } from "../core/tabs/TabLayoutManager";
import { editingLockService } from "../services/editingLockService";

interface TabContextMenuProps {
    tabId: string;
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onRequestAddComponent?: (tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
    tabId,
    isOpen,
    position,
    onClose,
    onRequestAddComponent,
}) => {
    const { currentTheme } = useTheme();
    const { currentLayout, removeTab } = useTabLayout();

    const tab = currentLayout?.tabs.find((t) => t.id === tabId);
    const isUnlocked = editingLockService.isUnlocked();

    console.log("TabContextMenu render:", {
        tabId,
        isOpen,
        tab,
        closable: tab?.closable,
        isUnlocked,
    });

    useEffect(() => {
        const handleClickOutside = () => onClose();
        if (isOpen) {
            document.addEventListener("click", handleClickOutside);
            return () =>
                document.removeEventListener("click", handleClickOutside);
        }
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [isOpen, onClose]);

    const handleRemove = () => {
        if (confirm(`Are you sure you want to remove the tab "${tab.name}"?`)) {
            removeTab(tabId);
        }
        onClose();
    };

    const handleAddComponent = () => {
        console.log(
            "TabContextMenu: handleAddComponent called for tab:",
            tabId
        );
        if (onRequestAddComponent) {
            onRequestAddComponent(tabId);
        }
        onClose();
    };

    // All hooks must be called before any conditional returns

    const menuItems = [
        ...(isUnlocked && onRequestAddComponent
            ? [
                  {
                      icon: (
                          <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                          >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                              />
                          </svg>
                      ),
                      label: "Add Component",
                      onClick: handleAddComponent,
                  },
              ]
            : []),
        {
            icon: (
                <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
            ),
            label: "Remove",
            onClick: handleRemove,
            dangerous: true,
        },
    ];

    return !tab || !tab.closable ? null : (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        style={{
                            position: "fixed",
                            top: position.y,
                            left: position.x,
                            zIndex: 20050,
                            backgroundColor: currentTheme.surface,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: "8px",
                            padding: "4px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                            backdropFilter: "blur(8px)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {menuItems.map((item) => (
                            <motion.button
                                key={item.label}
                                onClick={item.onClick}
                                whileHover={{
                                    backgroundColor: item.dangerous
                                        ? "#ef444420"
                                        : `${currentTheme.primary}15`,
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    width: "100%",
                                    padding: "8px 12px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    color: item.dangerous
                                        ? "#ef4444"
                                        : currentTheme.text,
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    transition: "all 0.1s ease",
                                    textAlign: "left",
                                    minWidth: "120px",
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
