import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    action?: () => void;
    divider?: boolean;
    disabled?: boolean;
    submenu?: ContextMenuItem[];
    danger?: boolean;
    tooltip?: string | React.ReactNode; // Tooltip content to show on hover
}

export interface ContextMenuProps {
    items: ContextMenuItem[];
    position: { x: number; y: number };
    isOpen: boolean;
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    items,
    position,
    isOpen,
    onClose,
}) => {
    const { currentTheme: theme } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
    const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    // Initialize with exact cursor position - will adjust if needed after render
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    // Update position immediately when it changes (before menu renders)
    useEffect(() => {
        setAdjustedPosition(position);
    }, [position]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("contextmenu", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("contextmenu", handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Adjust position to keep menu in viewport, with cursor at top-left for maximum ergonomics
    useEffect(() => {
        if (isOpen && menuRef.current) {
            // Use double requestAnimationFrame to ensure menu is fully rendered and measured accurately
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!menuRef.current) return;

                    const rect = menuRef.current.getBoundingClientRect();
                    const { innerWidth, innerHeight } = window;

                    // Start with exact cursor position - menu appears right where user clicked
                    let x = position.x;
                    let y = position.y;
                    let adjusted = false;
                    let adjustmentReason = "none";

                    // Only adjust if menu would actually be cut off (measure after render for accuracy)
                    if (rect.width > 0 && rect.height > 0) {
                        // Adjust horizontal position only if menu would be cut off on the right
                        if (x + rect.width > innerWidth - 5) {
                            // If menu would overflow right, position it to the left of cursor instead
                            x = position.x - rect.width;
                            adjusted = true;
                            adjustmentReason = "right-edge";
                            // If that would go off-screen left, just align to right edge with small margin
                            if (x < 5) {
                                x = innerWidth - rect.width - 5;
                                adjustmentReason = "right-edge-fallback";
                            }
                        }
                        // Only adjust left edge if menu would be cut off
                        if (x < 5) {
                            x = 5;
                            adjusted = true;
                            adjustmentReason = "left-edge";
                        }

                        // Adjust vertical position only if menu would be cut off on the bottom
                        if (y + rect.height > innerHeight - 5) {
                            // If menu would overflow bottom, position it above cursor instead
                            y = position.y - rect.height;
                            adjusted = true;
                            adjustmentReason = adjusted
                                ? adjustmentReason + ",bottom-edge"
                                : "bottom-edge";
                            // If that would go off-screen top, just align to bottom edge with small margin
                            if (y < 5) {
                                y = innerHeight - rect.height - 5;
                                adjustmentReason = adjusted
                                    ? adjustmentReason + ",bottom-edge-fallback"
                                    : "bottom-edge-fallback";
                            }
                        }
                        // Only adjust top edge if menu would be cut off
                        if (y < 5) {
                            y = 5;
                            adjusted = true;
                            adjustmentReason = adjusted
                                ? adjustmentReason + ",top-edge"
                                : "top-edge";
                        }
                    }

                    setAdjustedPosition({ x, y });
                });
            });
        }
    }, [isOpen, position]);

    const handleItemClick = (item: ContextMenuItem) => {
        // Debug logging to trace clicks
        try {
            console.info("[ContextMenu] item click", {
                label: item?.label,
                hasSubmenu: !!item?.submenu?.length,
                disabled: !!item?.disabled,
                hasAction: typeof item?.action === "function",
            });
        } catch {}

        // Do not trigger action for parent items that only open a submenu
        if (item.submenu && item.submenu.length > 0) {
            return;
        }
        if (item.disabled) {
            return;
        }

        if (item.action) {
            try {
                item.action();
                console.info("[ContextMenu] action invoked", { label: item.label });
            } catch (e) {
                console.error("[ContextMenu] action error", e);
            }
        }
        onClose();
    };

    const renderMenuItem = (item: ContextMenuItem, index: number) => {
        if (item.divider) {
            return (
                <div
                    key={index}
                    style={{
                        height: "1px",
                        backgroundColor: theme.border,
                        margin: "4px 0",
                    }}
                />
            );
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
            <motion.div
                key={index}
                whileHover={{
                    backgroundColor: item.disabled
                        ? "transparent"
                        : `${theme.primary}10`,
                }}
                onClick={() => handleItemClick(item)}
                onMouseEnter={(e) => {
                    if (hasSubmenu) {
                        setActiveSubmenu(index);
                    }
                    if (item.tooltip) {
                        setHoveredItemIndex(index);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({
                            x: rect.right + 8,
                            y: rect.top,
                        });
                    }
                }}
                onMouseLeave={() => {
                    if (hasSubmenu) {
                        setActiveSubmenu(null);
                    }
                    if (item.tooltip) {
                        setHoveredItemIndex(null);
                        setTooltipPosition(null);
                    }
                }}
                style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    color: item.disabled
                        ? theme.textSecondary
                        : item.danger
                        ? theme.danger
                        : theme.text,
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    opacity: item.disabled ? 0.5 : 1,
                    position: "relative",
                    userSelect: "none",
                    minWidth: 0, // Allow flex item to shrink
                    width: "100%", // Take full width of parent
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flex: 1,
                        minWidth: 0, // Allow flex item to shrink if needed
                    }}
                >
                    {item.icon && (
                        <span
                            style={{
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                flexShrink: 0, // Prevent icon from shrinking
                            }}
                        >
                            {item.icon}
                        </span>
                    )}
                    <span
                        style={{
                            whiteSpace: "nowrap",
                            overflow: "visible", // Ensure text is visible
                            textOverflow: "clip", // Don't clip text
                        }}
                    >
                        {item.label}
                    </span>
                </div>

                {hasSubmenu && (
                    <>
                        <span style={{ fontSize: "10px", opacity: 0.6 }}>
                            ▶
                        </span>
                        <AnimatePresence>
                            {activeSubmenu === index && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: "absolute",
                                        left: "100%",
                                        top: -8,
                                        marginLeft: "4px",
                                        minWidth: "230px", // Narrower but still fits "ROLL - Trade 2956 [GMF]"
                                        width: "max-content", // Allow menu to grow to fit content
                                        maxWidth: "350px", // Prevent it from getting too wide
                                        backgroundColor: theme.surface,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: "6px",
                                        boxShadow:
                                            "0 4px 12px rgba(0, 0, 0, 0.15)",
                                        padding: "4px 0",
                                        zIndex: 1001,
                                        overflow: "visible", // Ensure content is visible
                                    }}
                                >
                                    {item.submenu!.map((subItem, subIndex) =>
                                        renderMenuItem(
                                            subItem,
                                            `${index}-${subIndex}` as any
                                        )
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </motion.div>
        );
    };

    // Render menu in portal to escape parent transforms/overflow that affect fixed positioning
    const menuContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: "fixed",
                        left: adjustedPosition.x,
                        top: adjustedPosition.y,
                        minWidth: "180px",
                        width: "max-content", // Allow menu to grow to fit content
                        maxWidth: "300px", // Prevent it from getting too wide
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        padding: "4px 0",
                        zIndex: 10050,
                        // Ensure menu escapes any parent stacking contexts
                        isolation: "isolate",
                        overflow: "visible", // Ensure submenus are visible
                    }}
                >
                    {items.map((item, index) => renderMenuItem(item, index))}
                </motion.div>
            )}
        </AnimatePresence>
    );

    // Tooltip for menu items
    const tooltipContent = hoveredItemIndex !== null && items[hoveredItemIndex]?.tooltip ? (
        <AnimatePresence>
            {tooltipPosition && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                        position: "fixed",
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        padding: "8px 12px",
                        zIndex: 10060,
                        maxWidth: "300px",
                        fontSize: "12px",
                        color: theme.text,
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.5",
                    }}
                >
                    {typeof items[hoveredItemIndex].tooltip === "string"
                        ? items[hoveredItemIndex].tooltip
                        : items[hoveredItemIndex].tooltip}
                </motion.div>
            )}
        </AnimatePresence>
    ) : null;

    // Portal to document.body to escape parent transforms/overflow
    return typeof document !== "undefined" ? (
        <>
            {createPortal(menuContent, document.body)}
            {tooltipContent && createPortal(tooltipContent, document.body)}
        </>
    ) : (
        <>
            {menuContent}
            {tooltipContent}
        </>
    );
};

// Helper component for easier usage
export const ContextMenuWrapper: React.FC<{
    children: React.ReactNode;
    items: ContextMenuItem[];
}> = ({ children, items }) => {
    const [menuState, setMenuState] = useState({
        isOpen: false,
        position: { x: 0, y: 0 },
    });

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuState({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
        });
    };

    return (
        <>
            <div onContextMenu={handleContextMenu}>{children}</div>
            <ContextMenu
                items={items}
                position={menuState.position}
                isOpen={menuState.isOpen}
                onClose={() => setMenuState({ ...menuState, isOpen: false })}
            />
        </>
    );
};
