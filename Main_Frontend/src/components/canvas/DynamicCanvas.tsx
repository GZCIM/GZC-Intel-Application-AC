import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { useTheme } from "../../contexts/ThemeContext";
import { useTabLayout } from "../../core/tabs/TabLayoutManager";
import { useViewMemory } from "../../hooks/useViewMemory";
import {
    componentInventory,
    ComponentMeta,
} from "../../core/components/ComponentInventory";
import { ComponentRenderer } from "./ComponentRenderer";
import { ComponentPortalModal } from "../ComponentPortalModal";
import "../../styles/analytics-dashboard.css";
import "../../styles/dynamic-canvas.css";
import { editingLockService } from "../../services/editingLockService";

// Memoize WidthProvider for better performance (Context7 recommendation)
const ResponsiveGridLayout = WidthProvider(Responsive);

interface DynamicCanvasProps {
    tabId: string;
}

type DisplayMode = "medium" | "thumbnail";

interface ComponentInstance {
    id: string; // unique instance ID
    componentId: string; // reference to ComponentMeta
    x: number;
    y: number;
    w: number;
    h: number;
    props?: Record<string, unknown>; // Component-specific props
    component?: React.ComponentType<unknown>;
    displayMode?: DisplayMode; // runtime-only display mode
    originalW: number; // Store original dimensions
    originalH: number;
}

export const DynamicCanvas: React.FC<DynamicCanvasProps> = ({ tabId }) => {
    const { currentTheme } = useTheme();
    const { currentLayout, updateTab } = useTabLayout();
    const { saveLayout: saveToMemory, getLayout: loadFromMemory } =
        useViewMemory();
    const [components, setComponents] = useState<ComponentInstance[]>([]);
    const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [showComponentPortal, setShowComponentPortal] = useState(false);
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    // Removed gridKey - using containerWidth and debounced updates instead for smoother rendering
    const [containerWidth, setContainerWidth] = useState<number | undefined>(
        undefined
    ); // Force width recalculation
    const [fullScreenId, setFullScreenId] = useState<string | null>(null);

    const tab = useMemo(
        () => currentLayout?.tabs.find((t) => t.id === tabId),
        [currentLayout?.tabs, tabId]
    );
    const isEditMode = editingLockService.isUnlocked();

    // When entering edit (unlocked), force medium mode for all and exit full
    useEffect(() => {
        if (isEditMode) {
            setFullScreenId(null);
            console.log(
                `🔓 Entering edit mode: restoring all components to medium from CosmosDB`
            );

            // Restore all components to their original configuration from CosmosDB
            if (tab?.components) {
                setComponents((prev) =>
                    prev.map((c) => {
                        const originalComponent = tab.components.find(
                            (comp) => comp.id === c.id
                        );
                        if (originalComponent) {
                            console.log(
                                `📥 Restoring ${c.id} to: ${originalComponent.position.w}x${originalComponent.position.h} at (${originalComponent.position.x},${originalComponent.position.y})`
                            );
                            return {
                                ...c,
                                displayMode: "medium",
                                x: originalComponent.position.x,
                                y: originalComponent.position.y,
                                w: originalComponent.position.w,
                                h: originalComponent.position.h,
                                // Update original dimensions to match CosmosDB
                                originalW: originalComponent.position.w,
                                originalH: originalComponent.position.h,
                            };
                        }
                        return c;
                    })
                );
            }
        }
    }, [isEditMode, tab?.components]);

    // Load components from tab configuration (prioritize tab over memory for live updates)
    useEffect(() => {
        if (tab?.components && tab.components.length > 0) {
            // Always use tab configuration when it has components
            const loadedComponents = tab.components.map((comp) => {
                console.log(
                    `📥 Loading component ${comp.id}: ${comp.position.w}x${comp.position.h} at (${comp.position.x},${comp.position.y})`
                );
                return {
                    id: comp.id,
                    componentId: comp.type,
                    x: comp.position.x,
                    y: comp.position.y,
                    w: comp.position.w,
                    h: comp.position.h,
                    props: comp.props || {},
                    displayMode: "medium",
                    originalW: comp.position.w, // Store original dimensions
                    originalH: comp.position.h,
                };
            });
            setComponents(loadedComponents);
            // Clear any stale react-grid-layout state so generated layout uses fresh sizes
            setLayouts({});
            // Force immediate layout regeneration with new dimensions
            setTimeout(() => {
                console.log(
                    "🔄 Forcing layout regeneration after tab config change"
                );
                window.dispatchEvent(new Event("resize"));
                // Force grid to recalculate with new component dimensions
                const gridElement =
                    document.querySelector(".react-grid-layout");
                if (gridElement) {
                    gridElement.dispatchEvent(new Event("resize"));
                }
            }, 100);
        } else if (!tab?.components || tab.components.length === 0) {
            // Only load from memory if we don't already have components
            if (components.length === 0) {
                const memoryData = loadFromMemory(`dynamic-canvas-${tabId}`);
                if (memoryData && memoryData.components) {
                    const loadedComponents = memoryData.components.map(
                        (comp: any) => ({
                            id: comp.id,
                            componentId: comp.type,
                            x: comp.position.x,
                            y: comp.position.y,
                            w: comp.position.w,
                            h: comp.position.h,
                            props: comp.props || {},
                            displayMode: "medium",
                            originalW: comp.position.w, // Store original dimensions
                            originalH: comp.position.h,
                        })
                    );
                    setComponents(loadedComponents);
                    if (memoryData.layouts) {
                        setLayouts(memoryData.layouts);
                    }
                }
            }
        }
    }, [tabId, JSON.stringify(tab?.components || [])]);

    // Save current state - MOVED UP to fix temporal dead zone
    const saveLayoutToTab = useCallback(
        (layout?: Layout[]) => {
            const currentLayout = layout || layouts.lg || [];

            const tabComponents = components.map((comp) => {
                const layoutItem = currentLayout.find((l) => l.i === comp.id);
                return {
                    id: comp.id,
                    type: comp.componentId,
                    position: {
                        x: layoutItem?.x || comp.x,
                        y: layoutItem?.y || comp.y,
                        w: layoutItem?.w || comp.w,
                        h: layoutItem?.h || comp.h,
                    },
                    props: comp.props || {},
                    zIndex: 0,
                };
            });

            // Save to tab configuration
            updateTab(tabId, { components: tabComponents });

            // Also save to memory for persistence
            saveToMemory(`dynamic-canvas-${tabId}`, {
                components: tabComponents,
                layouts: layouts,
            });
        },
        [components, layouts, tabId, updateTab, saveToMemory]
    );

    // Update component positions based on layout
    const updateComponentPositions = useCallback((layout: Layout[]) => {
        setComponents((prev) =>
            prev.map((comp) => {
                const layoutItem = layout.find((l) => l.i === comp.id);
                if (layoutItem) {
                    return {
                        ...comp,
                        x: layoutItem.x,
                        y: layoutItem.y,
                        w: layoutItem.w,
                        h: layoutItem.h,
                        // Update original dimensions when resizing to keep thumbnail calculations accurate
                        originalW: layoutItem.w,
                        originalH: layoutItem.h,
                    };
                }
                return comp;
            })
        );
    }, []);

    // Handle layout changes - allow changes anytime
    const handleLayoutChange = useCallback(
        (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
            // Update layouts for visual feedback
            setLayouts(allLayouts);

            // Only update component positions when actively editing
            if (isEditMode && !isDragging && !isResizing) {
                updateComponentPositions(layout);
            }
        },
        [isDragging, isResizing, isEditMode, updateComponentPositions]
    );

    // Drag handlers - prevent state updates during drag
    const handleDragStart = useCallback(() => {
        console.log("🟡 Drag start");
        setIsDragging(true);
    }, []);

    const handleDragStop = useCallback(
        (layout: Layout[]) => {
            console.log("🟢 Drag stop - layout items:", layout?.length);
            setIsDragging(false);

            // Update positions and save immediately for better UX
            if (isEditMode) {
                // Update visual state
                setLayouts((prev) => ({ ...prev, lg: layout }));
                updateComponentPositions(layout);

                // Save the drag immediately so it persists
                setTimeout(() => saveLayoutToTab(layout), 100);
            }
        },
        [isEditMode, updateComponentPositions, saveLayoutToTab]
    );

    // Resize handlers - prevent state updates during resize
    const handleResizeStart = useCallback(() => {
        console.log("🟡 Resize start");
        setIsResizing(true);
    }, []);

    const handleResizeStop = useCallback(
        (layout: Layout[]) => {
            console.log("🟢 Resize stop - layout items:", layout?.length);
            setIsResizing(false);

            // Update positions and save immediately for better UX
            if (isEditMode) {
                // Update visual state
                setLayouts((prev) => ({ ...prev, lg: layout }));
                updateComponentPositions(layout);

                // Save the resize immediately so it persists
                setTimeout(() => {
                    console.log("💾 Saving after resize");
                    saveLayoutToTab(layout);
                }, 100);
            }
        },
        [isEditMode, updateComponentPositions, saveLayoutToTab]
    );

    // Save on explicit actions only (no longer tracking edit mode transitions)

    // Add new component to canvas
    const addComponent = (componentMeta: ComponentMeta) => {
        const newInstance: ComponentInstance = {
            id: `${componentMeta.id}_${Date.now()}`,
            componentId: componentMeta.id,
            x: 0,
            y: 0,
            w: componentMeta.defaultSize.w,
            h: componentMeta.defaultSize.h,
            displayMode: "medium",
            originalW: componentMeta.defaultSize.w, // Store original dimensions
            originalH: componentMeta.defaultSize.h,
        };

        setComponents((prev) => [...prev, newInstance]);

        // Auto-add to layout with proper constraints
        const newLayoutItem = {
            i: newInstance.id,
            x: newInstance.x,
            y: newInstance.y,
            w: newInstance.w,
            h: newInstance.h,
            minW: componentMeta.minSize.w,
            minH: componentMeta.minSize.h,
            maxW: componentMeta.maxSize?.w || 12,
            maxH: componentMeta.maxSize?.h || 20,
            isDraggable: true, // Allow dragging in all modes
            isResizable: true, // Allow resizing in all modes
        };

        setLayouts((prev) => ({
            ...prev,
            lg: [...(prev.lg || []), newLayoutItem],
        }));

        // Don't save when adding - wait for layout confirmation
    };

    // Remove component
    const removeComponent = (componentId: string) => {
        setComponents((prev) => prev.filter((c) => c.id !== componentId));
        setLayouts((prev) => ({
            ...prev,
            lg: (prev.lg || []).filter((l) => l.i !== componentId),
        }));
        // Save the change
        setTimeout(() => saveLayoutToTab(), 100);
    };

    // Mode helpers
    const setDisplayMode = (id: string, mode: DisplayMode) => {
        console.log(`🔄 Setting display mode for ${id} to ${mode}`);

        if (mode === "medium") {
            // For medium mode, restore the exact original configuration from CosmosDB
            console.log(
                `📐 Medium mode: restoring original configuration from CosmosDB`
            );

            // Force a complete reload of the component configuration from the tab
            if (tab?.components) {
                const originalComponent = tab.components.find(
                    (comp) => comp.id === id
                );
                if (originalComponent) {
                    console.log(
                        `📥 Restoring from CosmosDB: ${originalComponent.position.w}x${originalComponent.position.h} at (${originalComponent.position.x},${originalComponent.position.y})`
                    );

                    setComponents((prev) =>
                        prev.map((c) => {
                            if (c.id === id) {
                                return {
                                    ...c,
                                    displayMode: mode,
                                    x: originalComponent.position.x,
                                    y: originalComponent.position.y,
                                    w: originalComponent.position.w,
                                    h: originalComponent.position.h,
                                    // Update original dimensions to match CosmosDB
                                    originalW: originalComponent.position.w,
                                    originalH: originalComponent.position.h,
                                };
                            }
                            return c;
                        })
                    );
                    // Clear any stale RGL layout so it regenerates from component sizes
                    setLayouts({});
                }
            }
        } else if (mode === "thumbnail") {
            // For thumbnail mode, calculate compact dimensions
            setComponents((prev) =>
                prev.map((c) => {
                    if (c.id === id) {
                        const newW = Math.max(6, Math.floor(c.originalW * 0.6)); // ensure room for 3 icons
                        const newH = 1; // 1 grid unit height for header only
                        console.log(
                            `📱 Thumbnail mode: ${c.originalW}x${c.originalH} -> ${newW}x${newH}`
                        );
                        return {
                            ...c,
                            displayMode: mode,
                            w: newW,
                            h: newH,
                        };
                    }
                    return c;
                })
            );
        }

        // Trigger layout update and save after mode change
        setTimeout(() => {
            // Persist only in edit mode; view-mode toggles shouldn't overwrite Cosmos config
            if (isEditMode) {
                saveLayoutToTab();
            }
            // Force grid layout to recalculate
            window.dispatchEvent(new Event("resize"));
            // Additional force update for grid layout
            setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
                // Force a complete grid refresh
                const gridElement =
                    document.querySelector(".react-grid-layout");
                if (gridElement) {
                    gridElement.dispatchEvent(new Event("resize"));
                }
            }, 200);
        }, 100);
    };

    // Memoize layout generation to prevent infinite re-renders
    const generateLayout = useMemo((): Layout[] => {
        return components.map((comp) => {
            const meta = componentInventory.getComponent(comp.componentId);
            console.log(
                `🔧 Generating layout for ${comp.id}: mode=${comp.displayMode}, w=${comp.w}, originalW=${comp.originalW}`
            );

            // ALWAYS use the current component dimensions (which come from CosmosDB)
            // This ensures that when tab config changes, the component immediately reflects the new size
            const finalWidth =
                comp.displayMode === "thumbnail"
                    ? Math.max(2, comp.w) // For thumbnail, use current w
                    : comp.w; // For medium, ALWAYS use current w (from CosmosDB)

            const finalHeight =
                comp.displayMode === "thumbnail"
                    ? Math.max(1, comp.h) // For thumbnail, use current h
                    : comp.h; // For medium, ALWAYS use current h (from CosmosDB)

            return {
                i: comp.id,
                x: comp.x,
                y: comp.y,
                w: finalWidth,
                h: finalHeight,
                minW: meta?.minSize?.w || 2,
                minH: meta?.minSize?.h || 2,
                maxW: meta?.maxSize?.w || 12,
                maxH: meta?.maxSize?.h || 20,
                isDraggable: true, // Allow dragging in all modes
                isResizable: true, // Allow resizing in all modes
            };
        });
    }, [components]);

    // Memoize grid children to prevent hook order violations
    const gridChildren = useMemo(
        () =>
            components.map((instance) => {
                if (fullScreenId && instance.id !== fullScreenId) {
                    // Hide other components while full-screen is active
                    return null;
                }
                const title =
                    componentInventory.getComponent(instance.componentId)
                        ?.displayName || "Component";
                const isThumb = instance.displayMode === "thumbnail";
                return (
                    <div
                        key={`${instance.id}-${instance.displayMode}`}
                        className="grid-item" // Better control class
                        data-grid-key={`${instance.id}-${instance.displayMode}`}
                        data-display-mode={instance.displayMode}
                        style={
                            {
                                background: currentTheme.surface,
                                border: isEditMode
                                    ? `1px solid ${currentTheme.primary}`
                                    : `1px solid ${currentTheme.border}`,
                                borderRadius: "4px",
                                overflow: isThumb ? "hidden" : "visible", // Hide overflow in thumbnail mode
                                transition:
                                    isDragging || isResizing
                                        ? "none"
                                        : "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
                                boxShadow: isEditMode
                                    ? `0 2px 8px ${currentTheme.primary}20`
                                    : `0 1px 4px rgba(0,0,0,0.04)`,
                                transform: isEditMode
                                    ? "scale(1.01)"
                                    : "scale(1)",
                                willChange: "transform",
                                cursor: "auto", // Normal cursor - drag only from handle
                                pointerEvents: "auto",
                                display: "flex",
                                flexDirection: "column",
                                height: isThumb ? "28px" : "100%", // Fill full grid row height in medium mode
                                minHeight: isThumb ? "28px" : 0, // Allow children to stretch
                                // Force width using CSS variable - ALWAYS use current w from CosmosDB
                                "--grid-item-width": isThumb
                                    ? "auto"
                                    : `calc(${instance.w} * (100% / 12))`,
                            } as React.CSSProperties & {
                                "--grid-item-width": string;
                            }
                        }
                    >
                        {/* Header: only visible in thumbnail mode; in medium we float controls */}
                        {isThumb ? (
                            <div
                                className="drag-handle"
                                style={{
                                    height: "28px",
                                    background: `linear-gradient(to right, ${currentTheme.primary}10, transparent)`,
                                    borderBottom: "none",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0 8px",
                                    userSelect: "none",
                                    cursor: isEditMode ? "move" : "auto",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: currentTheme.text,
                                        opacity: 0.8,
                                    }}
                                >
                                    {title}
                                </span>
                                {!isEditMode && (
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {/* Switch to medium */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "medium"
                                                );
                                            }}
                                            title="Medium"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 4px",
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <rect
                                                    x="2"
                                                    y="2"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="8"
                                                    y="2"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="2"
                                                    y="8"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="8"
                                                    y="8"
                                                    width="4"
                                                    height="4"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFullScreenId(instance.id);
                                            }}
                                            title="Full"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 4px",
                                                border: `1px solid ${currentTheme.border}`,
                                                background:
                                                    fullScreenId === instance.id
                                                        ? `${currentTheme.primary}20`
                                                        : "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <path d="M5 1H1v4" />
                                                <path d="M9 13h4V9" />
                                                <path d="M13 5V1H9" />
                                                <path d="M1 9v4h4" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Invisible drag handle for edit mode when header hidden */}
                                {isEditMode && (
                                    <div
                                        className="drag-handle"
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 24,
                                            cursor: "move",
                                            opacity: 0,
                                        }}
                                    />
                                )}
                                {/* Floating controls in top-right for medium mode */}
                                {!isEditMode && (
                                    <div
                                        className="no-drag"
                                        style={{
                                            position: "absolute",
                                            top: 4, // nudge down to align with header text baseline
                                            right: 8,
                                            height: 30,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            zIndex: 3,
                                        }}
                                    >
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "thumbnail"
                                                );
                                            }}
                                            title="Thumbnail"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 4px",
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <rect
                                                    x="1"
                                                    y="2"
                                                    width="12"
                                                    height="10"
                                                    rx="1"
                                                />
                                                <rect
                                                    x="3"
                                                    y="4"
                                                    width="8"
                                                    height="6"
                                                    rx="0.5"
                                                    fill="currentColor"
                                                    opacity="0.7"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFullScreenId(instance.id);
                                            }}
                                            title="Full"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 4px",
                                                border: `1px solid ${currentTheme.border}`,
                                                background:
                                                    fullScreenId === instance.id
                                                        ? `${currentTheme.primary}20`
                                                        : "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <path d="M5 1H1v4" />
                                                <path d="M9 13h4V9" />
                                                <path d="M13 5V1H9" />
                                                <path d="M1 9v4h4" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Component content - hidden in thumbnail mode */}
                        {!isThumb && (
                            <div
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    position: "relative",
                                    // Reserve space on the right for medium-mode controls so they don't cover text
                                    paddingRight: !isEditMode ? 56 : 0,
                                }}
                            >
                                <ComponentRenderer
                                    componentId={instance.componentId}
                                    instanceId={instance.id}
                                    props={instance.props || {}}
                                    isEditMode={isEditMode}
                                    onRemove={() =>
                                        removeComponent(instance.id)
                                    }
                                    onPropsUpdate={(
                                        newProps: Record<string, any>
                                    ) => {
                                        setComponents((prev) =>
                                            prev.map((comp) =>
                                                comp.id === instance.id
                                                    ? {
                                                          ...comp,
                                                          props: newProps,
                                                      }
                                                    : comp
                                            )
                                        );
                                        // Save component props immediately for better UX
                                        setTimeout(
                                            () => saveLayoutToTab(),
                                            100
                                        );
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );
            }),
        [
            components,
            currentTheme,
            isDragging,
            isResizing,
            isEditMode,
            fullScreenId,
            removeComponent,
            saveLayoutToTab,
        ]
    );

    // Set layout ready after initial render and measure initial container width
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLayoutReady(true);
            // Measure initial container width
            const dashboardContent =
                document.querySelector(".dashboard-content");
            if (dashboardContent) {
                const initialWidth = dashboardContent.clientWidth;
                console.log("📏 Initial container width:", initialWidth);
                setContainerWidth(initialWidth);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [components.length]);

    // Force re-render when window resizes (includes left panel toggle)
    useEffect(() => {
        const handleResize = () => {
            // Let ResponsiveGridLayout handle resize naturally
            console.log("🔄 Window resize detected");
        };

        // Listen for resize events
        window.addEventListener("resize", handleResize);

        // Debounced panel toggle handler to prevent flashing
        let panelToggleTimeout: NodeJS.Timeout | null = null;

        const handlePanelToggle = () => {
            console.log("🔄 Panel toggle detected - using debounced update");

            // Clear any existing timeout to prevent multiple updates
            if (panelToggleTimeout) {
                clearTimeout(panelToggleTimeout);
            }

            // Single, debounced update after animation completes
            panelToggleTimeout = setTimeout(() => {
                const dashboardContent =
                    document.querySelector(".dashboard-content");
                if (dashboardContent) {
                    const newWidth = dashboardContent.clientWidth;
                    console.log(
                        "📏 Final container width measurement:",
                        newWidth
                    );

                    // Single update instead of multiple
                    setContainerWidth(newWidth);
                    // Only trigger resize event, let ResponsiveGridLayout handle it naturally
                    window.dispatchEvent(new Event("resize"));
                }
            }, 400); // Wait for CSS animation to complete (350ms + buffer)
        };
        window.addEventListener("panel-toggled", handlePanelToggle as any);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener(
                "panel-toggled",
                handlePanelToggle as any
            );
        };
    }, []);

    const fullScreenInstance = useMemo(
        () => components.find((c) => c.id === fullScreenId) || null,
        [components, fullScreenId]
    );

    return (
        <>
            {/* CSS Animations for smooth component transitions */}
            <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }

        .react-grid-item {
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
        }

        .react-grid-item.react-grid-placeholder {
          background: ${currentTheme.primary}20 !important;
          border: 2px dashed ${currentTheme.primary}60 !important;
          border-radius: 8px !important;
          opacity: 0.8 !important;
        }

                 /* Force thumbnail mode to be header-only */
         .react-grid-item[data-display-mode="thumbnail"] {
           height: 28px !important;
           min-height: 28px !important;
           max-height: 28px !important;
           overflow: hidden !important;
         }

                           /* Medium mode width follows layout (no hard-coded width) */

                    /* Force ALL grid items to use their specified width - OVERRIDE ANY GRID CONSTRAINTS */
          .react-grid-item {
            width: var(--grid-item-width, auto) !important;
            min-width: var(--grid-item-width, auto) !important;
            max-width: var(--grid-item-width, auto) !important;
          }

          /* Debug: Show grid item dimensions - HIDDEN */
          .react-grid-item::before {
            display: none;
          }



        /* Additional thumbnail enforcement */
        .react-grid-item[data-display-mode="thumbnail"] .grid-item {
          height: 28px !important;
          min-height: 28px !important;
          max-height: 28px !important;
          overflow: hidden !important;
        }

        /* In edit mode, disable component interaction except for remove button */
        ${
            isEditMode
                ? `
          .grid-item .react-resizable-handle {
            pointer-events: auto !important;
            display: block !important;
            width: 12px !important;
            height: 12px !important;
            opacity: 0.9 !important;
          }
          .grid-item .react-resizable-handle::after {
            content: '';
            position: absolute;
            right: 2px;
            bottom: 2px;
            width: 8px;
            height: 8px;
            border-right: 2px solid ${currentTheme.primary};
            border-bottom: 2px solid ${currentTheme.primary};
            opacity: 0.8;
          }
          .grid-item .react-resizable-handle-se {
            cursor: se-resize !important;
          }

          /* Keep remove button always interactive */
          .grid-item button.remove-component {
            pointer-events: auto !important;
          }
        `
                : `
          /* In normal mode, ensure all component interactions work */
          .grid-item {
            pointer-events: auto !important;
          }

          .grid-item * {
            pointer-events: auto !important;
          }

          /* Disable grid drag handle in normal mode */
          .react-grid-item > .react-resizable-handle {
            display: none !important;
          }
        `
        }
      `}</style>

            <div
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: currentTheme.background,
                    position: "relative",
                }}
            >
                {/* Canvas Area */}
                <div
                    style={{
                        height: "100%",
                        width: "100%",
                        padding: "2px",
                        overflowX: "hidden",
                        overflowY: "auto",
                    }}
                >
                    {components.length === 0 ? (
                        <div
                            style={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column",
                                gap: "16px",
                                color: currentTheme.textSecondary,
                            }}
                        >
                            <div style={{ fontSize: "48px", opacity: 0.3 }}>
                                📊
                            </div>
                            <div
                                style={{ fontSize: "16px", fontWeight: "500" }}
                            >
                                Dynamic Canvas
                            </div>
                            <div
                                style={{
                                    fontSize: "12px",
                                    textAlign: "center",
                                    maxWidth: "300px",
                                }}
                            >
                                {isEditMode
                                    ? 'Click "Add Component" button to add components. Drag and resize to arrange them.'
                                    : "Use Tools → Unlock to add and arrange components. Changes auto-save."}
                            </div>
                            {isEditMode && (
                                <button
                                    onClick={() => setShowComponentPortal(true)}
                                    style={{
                                        marginTop: "16px",
                                        padding: "10px 20px",
                                        backgroundColor: currentTheme.primary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <span>➕</span> Add Your First Component
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            key={`container-${containerWidth || "auto"}`} // Stable key based on width only
                            style={{
                                height: "100%",
                                width: "100%",
                                position: "relative",
                                // Force layout recalculation
                                minWidth: 0,
                            }}
                        >
                            {!fullScreenId && (
                                <ResponsiveGridLayout
                                    key={`grid-${containerWidth || "auto"}`} // Stable key - only changes when width actually changes
                                    className={`layout ${
                                        isLayoutReady ? "layout-ready" : ""
                                    }`}
                                    layouts={
                                        layouts.lg
                                            ? layouts
                                            : {
                                                  lg: generateLayout,
                                                  md: generateLayout,
                                                  sm: generateLayout,
                                                  xs: generateLayout,
                                                  xxs: generateLayout,
                                              }
                                    }
                                    onLayoutChange={(layout, allLayouts) => {
                                        console.log(
                                            "🔍 Layout change detected:",
                                            {
                                                layout: layout.map((l) => ({
                                                    i: l.i,
                                                    x: l.x,
                                                    y: l.y,
                                                    w: l.w,
                                                    h: l.h,
                                                })),
                                                allLayouts:
                                                    Object.keys(allLayouts),
                                                currentBreakpoint: allLayouts.lg
                                                    ? "lg"
                                                    : "unknown",
                                            }
                                        );
                                        handleLayoutChange(layout, allLayouts);
                                    }}
                                    onBreakpointChange={(breakpoint) => {
                                        console.log(
                                            `🔍 Breakpoint changed to: ${breakpoint}, cols: ${
                                                breakpoint === "lg"
                                                    ? 12
                                                    : breakpoint === "md"
                                                    ? 10
                                                    : breakpoint === "sm"
                                                    ? 6
                                                    : breakpoint === "xs"
                                                    ? 4
                                                    : 2
                                            }`
                                        );
                                        // Force immediate layout recalculation
                                        setTimeout(() => {
                                            window.dispatchEvent(
                                                new Event("resize")
                                            );
                                        }, 100);
                                    }}
                                    onDragStart={handleDragStart}
                                    onDragStop={handleDragStop}
                                    onResizeStart={handleResizeStart}
                                    onResizeStop={handleResizeStop}
                                    isDraggable={true} // Always allow dragging
                                    isResizable={true} // Always allow resizing
                                    useCSSTransforms={true} // 6x faster paint performance
                                    transformScale={1} // Important for smooth scaling
                                    margin={[2, 2]}
                                    containerPadding={[0, 0]}
                                    rowHeight={60}
                                    cols={{
                                        lg: 12,
                                        md: 10,
                                        sm: 6,
                                        xs: 4,
                                        xxs: 2,
                                    }}
                                    breakpoints={{
                                        lg: 1000, // Lowered from 1200 to accommodate your 1054px container
                                        md: 996,
                                        sm: 768,
                                        xs: 480,
                                        xxs: 0,
                                    }}
                                    compactType={null} // disable compaction; honor CosmosDB x,y,h exactly
                                    preventCollision={true}
                                    draggableHandle=".drag-handle"
                                    draggableCancel=".no-drag" // Prevent dragging on specific elements like buttons
                                >
                                    {gridChildren}
                                </ResponsiveGridLayout>
                            )}

                            {fullScreenId && fullScreenInstance && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: currentTheme.background,
                                        border: `1px solid ${currentTheme.border}`,
                                        borderRadius: 6,
                                        padding: 6,
                                        zIndex: 5,
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    {/* Absolute controls aligned with host header; remove extra internal header spacing */}
                                    <div
                                        className="no-drag"
                                        style={{
                                            position: "absolute",
                                            top: 4, // match medium-mode offset
                                            right: 8,
                                            height: 30,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            zIndex: 3,
                                        }}
                                    >
                                        <button
                                            onClick={() => {
                                                setDisplayMode(
                                                    fullScreenInstance.id,
                                                    "thumbnail"
                                                );
                                                setFullScreenId(null);
                                            }}
                                            title="Thumbnail"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 6px",
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                background: "transparent",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <rect
                                                    x="1"
                                                    y="2"
                                                    width="12"
                                                    height="10"
                                                    rx="1"
                                                />
                                                <rect
                                                    x="3"
                                                    y="4"
                                                    width="8"
                                                    height="6"
                                                    rx="0.5"
                                                    fill="currentColor"
                                                    opacity="0.7"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Restore to medium and exit full-screen
                                                setDisplayMode(
                                                    fullScreenInstance.id,
                                                    "medium"
                                                );
                                                setFullScreenId(null);
                                            }}
                                            title="Medium"
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 6px",
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                background: "transparent",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {/* grid pictogram */}
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 14 14"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <rect
                                                    x="2"
                                                    y="2"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="8"
                                                    y="2"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="2"
                                                    y="8"
                                                    width="4"
                                                    height="4"
                                                />
                                                <rect
                                                    x="8"
                                                    y="8"
                                                    width="4"
                                                    height="4"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            position: "relative",
                                        }}
                                    >
                                        <ComponentRenderer
                                            componentId={
                                                fullScreenInstance.componentId
                                            }
                                            instanceId={fullScreenInstance.id}
                                            props={
                                                fullScreenInstance.props || {}
                                            }
                                            isEditMode={isEditMode}
                                            onRemove={() =>
                                                removeComponent(
                                                    fullScreenInstance.id
                                                )
                                            }
                                            onPropsUpdate={(
                                                newProps: Record<string, any>
                                            ) => {
                                                setComponents((prev) =>
                                                    prev.map((comp) =>
                                                        comp.id ===
                                                        fullScreenInstance.id
                                                            ? {
                                                                  ...comp,
                                                                  props: newProps,
                                                              }
                                                            : comp
                                                    )
                                                );
                                                setTimeout(
                                                    () => saveLayoutToTab(),
                                                    100
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Component Portal Modal */}
                <ComponentPortalModal
                    isOpen={showComponentPortal}
                    onClose={() => {
                        setShowComponentPortal(false);
                    }}
                    onComponentSelect={(componentId) => {
                        const meta =
                            componentInventory.getComponent(componentId);

                        if (meta) {
                            addComponent(meta);
                            setShowComponentPortal(false);
                        } else {
                            console.error(
                                "Component not found in inventory:",
                                componentId
                            );
                        }
                    }}
                />
            </div>
        </>
    );
};
