import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { motion } from "framer-motion";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { useTheme } from "../../contexts/ThemeContext";
import { useTabLayout } from "../../core/tabs/TabLayoutManager";
import { useViewMemory } from "../../hooks/useViewMemory";
import { useDebouncedUserMemory } from "../../hooks/useUserMemory";
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
    props?: Record<string, any>; // Component-specific props
    component?: React.ComponentType<any>;
    displayMode?: DisplayMode; // runtime-only display mode
}

export const DynamicCanvas: React.FC<DynamicCanvasProps> = ({ tabId }) => {
    const { currentTheme } = useTheme();
    const { currentLayout, updateTab } = useTabLayout();
    const { saveLayout: saveToMemory, getLayout: loadFromMemory } =
        useViewMemory();
    const { saveLayout: saveLayoutDebounced } = useDebouncedUserMemory();
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
            setComponents((prev) =>
                prev.map((c) => ({ ...c, displayMode: "medium" }))
            );
        }
    }, [isEditMode]);

    // Load components from tab configuration (prioritize tab over memory for live updates)
    useEffect(() => {
        if (tab?.components && tab.components.length > 0) {
            // Always use tab configuration when it has components
            const loadedComponents = tab.components.map((comp) => ({
                id: comp.id,
                componentId: comp.type,
                x: comp.position.x,
                y: comp.position.y,
                w: comp.position.w,
                h: comp.position.h,
                props: comp.props || {},
                displayMode: "medium",
            }));
            setComponents(loadedComponents);
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
                        })
                    );
                    setComponents(loadedComponents);
                    if (memoryData.layouts) {
                        setLayouts(memoryData.layouts);
                    }
                }
            }
        }
    }, [tabId, tab?.components?.length]);

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

            // Only update component positions when NOT actively dragging/resizing
            if (!isDragging && !isResizing) {
                updateComponentPositions(layout);
            }
        },
        [isDragging, isResizing, updateComponentPositions]
    );

    // Drag handlers - prevent state updates during drag
    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDragStop = useCallback(
        (layout: Layout[]) => {
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
        setIsResizing(true);
    }, []);

    const handleResizeStop = useCallback(
        (layout: Layout[]) => {
            setIsResizing(false);

            // Update positions and save immediately for better UX
            if (isEditMode) {
                // Update visual state
                setLayouts((prev) => ({ ...prev, lg: layout }));
                updateComponentPositions(layout);

                // Save the resize immediately so it persists
                setTimeout(() => saveLayoutToTab(layout), 100);
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
        setComponents((prev) =>
            prev.map((c) => (c.id === id ? { ...c, displayMode: mode } : c))
        );
    };

    // Memoize layout generation to prevent infinite re-renders
    const generateLayout = useMemo((): Layout[] => {
        return components.map((comp) => {
            const meta = componentInventory.getComponent(comp.componentId);
            return {
                i: comp.id,
                x: comp.x,
                y: comp.y,
                w: comp.w,
                h: comp.h,
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
                        key={instance.id}
                        className="grid-item" // Better control class
                        style={{
                            background: currentTheme.surface,
                            border: isEditMode
                                ? `1px solid ${currentTheme.primary}`
                                : `1px solid ${currentTheme.border}`,
                            borderRadius: "4px",
                            overflow: "visible", // Allow 3D transforms
                            transition:
                                isDragging || isResizing
                                    ? "none"
                                    : "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
                            boxShadow: isEditMode
                                ? `0 2px 8px ${currentTheme.primary}20`
                                : `0 1px 4px rgba(0,0,0,0.04)`,
                            transform: isEditMode ? "scale(1.01)" : "scale(1)",
                            willChange: "transform",
                            cursor: "auto", // Normal cursor - drag only from handle
                            pointerEvents: "auto",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Header / title + controls (when unlocked) */}
                        <div
                            className="drag-handle"
                            style={{
                                height: "28px",
                                background: `linear-gradient(to right, ${currentTheme.primary}10, transparent)`,
                                borderBottom: `1px solid ${currentTheme.border}`,
                                borderRadius: "4px 4px 0 0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0 8px",
                                userSelect: "none",
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
                                <div style={{ display: "flex", gap: 6 }}>
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
                                            padding: "2px 6px",
                                            border: `1px solid ${currentTheme.border}`,
                                            background: isThumb
                                                ? `${currentTheme.primary}20`
                                                : "transparent",
                                            borderRadius: 4,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {/* thumbnail pictogram */}
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
                                                y="3"
                                                width="10"
                                                height="8"
                                                rx="2"
                                            />
                                            <rect
                                                x="3.5"
                                                y="4.5"
                                                width="4"
                                                height="3"
                                                rx="1"
                                                fill="currentColor"
                                                stroke="none"
                                            />
                                        </svg>
                                    </button>
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
                                            padding: "2px 6px",
                                            border: `1px solid ${currentTheme.border}`,
                                            background:
                                                !isThumb && !fullScreenId
                                                    ? `${currentTheme.primary}20`
                                                    : "transparent",
                                            borderRadius: 4,
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
                                    <button
                                        className="no-drag"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFullScreenId(instance.id);
                                        }}
                                        title="Full"
                                        style={{
                                            fontSize: 11,
                                            padding: "2px 6px",
                                            border: `1px solid ${currentTheme.border}`,
                                            background:
                                                fullScreenId === instance.id
                                                    ? `${currentTheme.primary}20`
                                                    : "transparent",
                                            borderRadius: 4,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {/* expand pictogram */}
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

                        {/* Component content */}
                        <div
                            style={{
                                flex: 1,
                                position: "relative",
                                padding: isThumb ? 8 : 0,
                            }}
                        >
                            {isThumb ? (
                                <div
                                    style={{
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexDirection: "column",
                                        gap: 8,
                                        color: currentTheme.textSecondary,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "60%",
                                            height: 50,
                                            borderRadius: 6,
                                            background: `${currentTheme.border}55`,
                                        }}
                                    />
                                    <div style={{ fontSize: 12 }}>{title}</div>
                                </div>
                            ) : (
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
                            )}
                        </div>
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
                                            : { lg: generateLayout }
                                    }
                                    onLayoutChange={handleLayoutChange}
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
                                        lg: 1200,
                                        md: 996,
                                        sm: 768,
                                        xs: 480,
                                        xxs: 0,
                                    }}
                                    compactType="vertical"
                                    preventCollision={false}
                                    // No drag handle restriction - drag from anywhere
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
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "4px 6px",
                                            borderBottom: `1px solid ${currentTheme.border}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 12,
                                                opacity: 0.8,
                                            }}
                                        >
                                            {componentInventory.getComponent(
                                                fullScreenInstance.componentId
                                            )?.displayName || "Component"}
                                        </div>
                                        <div
                                            style={{ display: "flex", gap: 8 }}
                                        >
                                            <button
                                                onClick={() =>
                                                    setDisplayMode(
                                                        fullScreenInstance.id,
                                                        "thumbnail"
                                                    )
                                                }
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
                                                        x="2"
                                                        y="3"
                                                        width="10"
                                                        height="8"
                                                        rx="2"
                                                    />
                                                    <rect
                                                        x="3.5"
                                                        y="4.5"
                                                        width="4"
                                                        height="3"
                                                        rx="1"
                                                        fill="currentColor"
                                                        stroke="none"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setFullScreenId(null)
                                                }
                                                title="Exit Full"
                                                style={{
                                                    fontSize: 11,
                                                    padding: "2px 8px",
                                                    background:
                                                        currentTheme.primary,
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                ⛶
                                            </button>
                                        </div>
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
