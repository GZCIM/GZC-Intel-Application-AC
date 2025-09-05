import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
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
import "../../styles/dynamic-canvas-overrides.css";
import { editingLockService } from "../../services/editingLockService";

// Grid unit size: 1 grid unit = 28px (used for thumbnail height)
// Standard thumbnail dimensions: w: 4, h: 2 (4 grid units wide, 2 grid units tall for mobile visibility)

// Memoize WidthProvider for better performance (Context7 recommendation)
const ResponsiveGridLayout = WidthProvider(Responsive);

interface DynamicCanvasProps {
    tabId: string;
}

type DisplayMode = "medium" | "thumbnail" | "full";

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
    customTitle?: string; // optional custom title for thumbnail
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
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [showComponentPortal, setShowComponentPortal] = useState(false);
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    // Local changes during edit mode (not persisted until lock)
    const [localChanges, setLocalChanges] = useState<{
        components: ComponentInstance[];
        layouts: { [key: string]: Layout[] };
    }>({ components: [], layouts: {} });

    // View-only overrides for display mode while LOCKED (not persisted)
    const [lockedViewMode, setLockedViewMode] = useState<
        Record<string, DisplayMode>
    >({});
    // Removed gridKey - using containerWidth and debounced updates instead for smoother rendering
    const [containerWidth, setContainerWidth] = useState<number | undefined>(
        undefined
    ); // Force width recalculation
    const [fullScreenId, setFullScreenId] = useState<string | null>(null);
    const [editModeVersion, setEditModeVersion] = useState(0); // bump to re-render on edit toggle
    const resizeTimerRef = useRef<number | null>(null);
    // Temporarily disable the new fullscreen overlay to revert to legacy behavior
    const enableFullOverlay = false;

    const triggerResize = useCallback(() => {
        if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current);
        }
        resizeTimerRef.current = window.setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
        }, 120);
    }, []);

    // React immediately to global edit-mode toggles so the canvas switches views without tab change
    useEffect(() => {
        const onToggle = (e: any) => {
            setEditModeVersion((v) => v + 1);
            triggerResize();
        };
        window.addEventListener("gzc:edit-mode-toggled", onToggle as any);
        return () => {
            window.removeEventListener(
                "gzc:edit-mode-toggled",
                onToggle as any
            );
        };
    }, [triggerResize]);

    const tab = useMemo(
        () => currentLayout?.tabs.find((t) => t.id === tabId),
        [currentLayout?.tabs, tabId]
    );
    const isEditMode = editingLockService.isUnlocked();
    const prevIsEditModeRef = useRef<boolean>(isEditMode);

    // Debug logging for edit mode state
    useEffect(() => {
        console.log("🔓 Edit mode state changed:", { isEditMode, tabId });
    }, [isEditMode, tabId]);

    // Mobile portrait detection
    useEffect(() => {
        const onResize = () => {
            const smallWidth = window.innerWidth <= 768;
            const isPortrait = window.innerHeight > window.innerWidth;
            const mobilePortrait = smallWidth || (isPortrait && window.innerWidth <= 1024);
            setIsMobilePortrait(mobilePortrait);
        };

        // Initial check
        onResize();

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Debug button dimensions when in thumbnail mode
    useEffect(() => {
        if (isEditMode) {
            setTimeout(() => {
                const buttons = document.querySelectorAll(".no-drag");
                buttons.forEach((button, index) => {
                    const computedStyle = window.getComputedStyle(
                        button as Element
                    );
                    console.log(`🔍 Button ${index} Debug:`, {
                        element: button,
                        height: computedStyle.height,
                        minHeight: computedStyle.minHeight,
                        maxHeight: computedStyle.maxHeight,
                        padding: computedStyle.padding,
                        fontSize: computedStyle.fontSize,
                        lineHeight: computedStyle.lineHeight,
                        boxSizing: computedStyle.boxSizing,
                        display: computedStyle.display,
                        actualHeight: (button as HTMLElement).offsetHeight,
                        actualWidth: (button as HTMLElement).offsetWidth,
                        title: (button as HTMLElement).title,
                    });
                });
            }, 100);
        }
    }, [isEditMode]);

    // When entering edit (unlocked) for the first time, normalize to medium once
    useEffect(() => {
        const justEnteredEdit = isEditMode && !prevIsEditModeRef.current;
        prevIsEditModeRef.current = isEditMode;
        if (!justEnteredEdit) return;

        setFullScreenId(null);
        console.log(
            `🔓 Entering edit mode: restoring all components to medium from CosmosDB`
        );

        if (tab?.components) {
            setComponents((prev) =>
                prev.map((c) => {
                    const originalComponent = tab.components!.find(
                        (comp) => comp.id === c.id
                    );
                    if (originalComponent) {
                        const meta = componentInventory.getComponent(
                            originalComponent.type
                        );
                        console.log(
                            `📥 Restoring ${c.id} to: ${originalComponent.position.w}x${originalComponent.position.h} at (${originalComponent.position.x},${originalComponent.position.y})`
                        );
                        // Respect saved displayMode in edit mode
                        const savedMode = (originalComponent as any).props
                            ?.displayMode as DisplayMode | undefined;
                        if (savedMode === "thumbnail") {
                            // Keep thumbnail footprint in edit mode, preserve original dims for restoration
                            const preservedW =
                                c.originalW || meta?.defaultSize?.w || 6;
                            const preservedH =
                                c.originalH || meta?.defaultSize?.h || 5;
                            return {
                                ...c,
                                displayMode: "thumbnail",
                                x: originalComponent.position.x,
                                y: originalComponent.position.y,
                                // Standard thumbnail dimensions in edit mode
                                w: 4,
                                h: 1,
                                originalW: preservedW,
                                originalH: preservedH,
                            };
                        }
                        const mediumW = originalComponent.position.w;
                        const mediumH = originalComponent.position.h;
                        return {
                            ...c,
                            displayMode: "medium",
                            x: originalComponent.position.x,
                            y: originalComponent.position.y,
                            w: mediumW,
                            h: mediumH,
                            originalW: mediumW,
                            originalH: mediumH,
                        };
                    }
                    return c;
                })
            );
        }
    }, [isEditMode]);

    // Load components from tab configuration (prioritize tab over memory for live updates)
    useEffect(() => {
        if (tab?.components && tab.components.length > 0) {
            // Always use tab configuration when it has components
            console.log("📥 Loading tab components:", tab.components);
            // Clear view-only overrides on fresh load
            setLockedViewMode({});
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
                    displayMode:
                        (comp.props && (comp.props as any).displayMode) ||
                        "medium",
                    customTitle:
                        (comp.props && (comp.props as any).customTitle) ||
                        undefined,
                    originalW: comp.position.w, // Store original dimensions
                    originalH: comp.position.h,
                };
            });
            setComponents(loadedComponents);
            // Honor any saved full-mode preference (first one wins)
            const fullPref = loadedComponents.find(
                (c) => c.displayMode === "full"
            );
            if (fullPref) {
                setFullScreenId(fullPref.id);
            }
            // Force immediate layout regeneration with new dimensions
            setTimeout(() => {
                console.log(
                    "🔄 Forcing layout regeneration after tab config change"
                );
                triggerResize();
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
            // Always save when called - the calling code controls when to call this
            console.log("💾 Saving layout to tab");
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
                    props: {
                        ...(comp.props || {}),
                        displayMode: comp.displayMode,
                        customTitle: comp.customTitle,
                    },
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

    // Persist only displayMode (and customTitle) for a specific component ID immediately
    const saveDisplayModeFor = useCallback(
        (componentId: string, mode: DisplayMode) => {
            if (editingLockService.isUnlocked()) return; // only when locked
            const currentLayout = layouts.lg || [];
            const tabComponents = components.map((comp) => {
                const layoutItem = currentLayout.find((l) => l.i === comp.id);
                const nextMode =
                    comp.id === componentId ? mode : comp.displayMode;
                return {
                    id: comp.id,
                    type: comp.componentId,
                    position: {
                        x: layoutItem?.x || comp.x,
                        y: layoutItem?.y || comp.y,
                        w: layoutItem?.w || comp.w,
                        h: layoutItem?.h || comp.h,
                    },
                    props: {
                        ...(comp.props || {}),
                        displayMode: nextMode,
                        customTitle: comp.customTitle,
                    },
                    zIndex: 0,
                };
            });
            updateTab(tabId, { components: tabComponents });
            saveToMemory(`dynamic-canvas-${tabId}`, {
                components: tabComponents,
                layouts: layouts,
            });
        },
        [components, layouts, tabId, updateTab, saveToMemory]
    );

    // Persist to CosmosDB when user LOCKS editing from ToolsMenu
    useEffect(() => {
        const onToggleAndMaybeSave = (e: any) => {
            try {
                const unlocked = !!e?.detail?.unlocked;
                console.log("🔒 Edit mode toggle event:", {
                    unlocked,
                    detail: e?.detail,
                });
                if (!unlocked) {
                    console.log(
                        "💾 Locking edit mode - saving current layout to CosmosDB"
                    );
                    // Merge locked view overrides to persisted payload (persist 4x1 for thumbnails)
                    const currentLayout = layouts.lg || [];
                    const thumbnailGridWidth = 4;
                    const tabComponents = components.map((comp) => {
                        const overrideMode = lockedViewMode[comp.id];
                        const finalMode = overrideMode || comp.displayMode;
                        const layoutItem = currentLayout.find(
                            (l) => l.i === comp.id
                        );
                        const persistW =
                            finalMode === "thumbnail"
                                ? thumbnailGridWidth
                                : layoutItem?.w || comp.w;
                        const persistH =
                            finalMode === "thumbnail"
                                ? 1
                                : layoutItem?.h || comp.h;
                        return {
                            id: comp.id,
                            type: comp.componentId,
                            position: {
                                x: layoutItem?.x || comp.x,
                                y: layoutItem?.y || comp.y,
                                w: persistW,
                                h: persistH,
                            },
                            props: {
                                ...(comp.props || {}),
                                displayMode: finalMode,
                                customTitle: comp.customTitle,
                            },
                            zIndex: 0,
                        };
                    });
                    console.log(
                        "💾 Calling updateTab with components:",
                        tabComponents
                    );
                    updateTab(tabId, { components: tabComponents });
                    console.log("💾 updateTab called successfully");
                    saveToMemory(`dynamic-canvas-${tabId}`, {
                        components: tabComponents,
                        layouts: layouts,
                    });
                    setLockedViewMode({});
                }
            } catch {}
        };
        window.addEventListener(
            "gzc:edit-mode-toggled",
            onToggleAndMaybeSave as any
        );
        return () =>
            window.removeEventListener(
                "gzc:edit-mode-toggled",
                onToggleAndMaybeSave as any
            );
    }, [components, layouts, lockedViewMode, tabId, updateTab, saveToMemory]);

    // Update component positions based on layout
    const updateComponentPositions = useCallback((layout: Layout[]) => {
        setComponents((prev) =>
            prev.map((comp) => {
                const layoutItem = layout.find((l) => l.i === comp.id);
                if (!layoutItem) return comp;

                // Do not overwrite original dimensions while in thumbnail mode.
                // Thumbnail is a compact, header-only view and should not reset the
                // remembered medium/full dimensions that we restore later.
                const isThumbnail =
                    (comp.displayMode || "medium") === "thumbnail";

                return {
                    ...comp,
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h,
                    originalW: isThumbnail ? comp.originalW : layoutItem.w,
                    originalH: isThumbnail ? comp.originalH : layoutItem.h,
                };
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

            // Update positions but don't save immediately - wait for lock
            if (isEditMode) {
                // Update visual state
                setLayouts((prev) => ({ ...prev, lg: layout }));
                updateComponentPositions(layout);
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

            // Update positions but don't save immediately - wait for lock
            if (isEditMode) {
                // Update visual state
                setLayouts((prev) => ({ ...prev, lg: layout }));
                updateComponentPositions(layout);
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
        // Don't save immediately - wait for lock
    };

    // Mode helpers
    const setDisplayMode = (id: string, mode: DisplayMode) => {
        console.log(
            `🔄 Setting display mode for ${id} to ${mode} (editMode: ${isEditMode})`
        );

        // If we're LOCKED, treat mode changes as view-only and do not mutate saved state
        if (!isEditMode) {
            // View change in locked mode should also persist displayMode so it survives reloads
            setLockedViewMode((prev) => ({ ...prev, [id]: mode }));
            setComponents((prev) =>
                prev.map((c) =>
                    c.id === id
                        ? {
                              ...c,
                              displayMode: mode,
                          }
                        : c
                )
            );
            if (mode === "full") {
                setFullScreenId(id);
            } else if (fullScreenId === id) {
                setFullScreenId(null);
            }
            // Recalc layout and persist while locked
            setTimeout(() => {
                triggerResize();
            }, 50);
            return;
        }

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
                    const meta = componentInventory.getComponent(
                        originalComponent.type
                    );
                    console.log(
                        `📥 Restoring from CosmosDB: ${originalComponent.position.w}x${originalComponent.position.h} at (${originalComponent.position.x},${originalComponent.position.y})`
                    );

                    setComponents((prev) =>
                        prev.map((c) => {
                            if (c.id === id) {
                                // Always use the original CosmosDB dimensions for medium mode
                                // Don't check saved displayMode - just restore the position dimensions
                                const mediumW = originalComponent.position.w;
                                const mediumH = originalComponent.position.h;

                                console.log(
                                    `📐 Restoring ${c.id} to medium: ${mediumW}x${mediumH} from CosmosDB position`
                                );

                                return {
                                    ...c,
                                    displayMode: mode,
                                    x: originalComponent.position.x,
                                    y: originalComponent.position.y,
                                    w: mediumW,
                                    h: mediumH,
                                    // Update original dimensions to match CosmosDB
                                    originalW: mediumW,
                                    originalH: mediumH,
                                };
                            }
                            return c;
                        })
                    );
                    // Force layout regeneration from component sizes
                    triggerResize();
                }
            }
        } else if (mode === "thumbnail") {
            // For thumbnail mode, use standard dimensions
            setComponents((prev) =>
                prev.map((c) => {
                    if (c.id === id) {
                        const newW = 4; // Standard thumbnail width
                        const newH = 2; // Standard thumbnail height (2 grid units for mobile visibility)
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
        } else if (mode === "full") {
            // Persist full preference and show fullscreen
            setComponents((prev) =>
                prev.map((c) =>
                    c.id === id
                        ? {
                              ...c,
                              displayMode: mode,
                          }
                        : c
                )
            );
            setFullScreenId(id);
        }

        // Trigger layout update after mode change (no immediate save)
        setTimeout(() => {
            // Debounced grid layout recalc
            triggerResize();
        }, 100);
    };

    // Memoize layout generation to prevent infinite re-renders
    const generateLayout = useMemo((): Layout[] => {
        console.log(
            "🔧 Generating layout for components:",
            components.map((c) => ({
                id: c.id,
                x: c.x,
                y: c.y,
                w: c.w,
                h: c.h,
                mode: c.displayMode,
            }))
        );
        // Precompute thumbnail stacking order and viewport-based rows
        const rowHeightPx = 60;
        const viewportHeight =
            typeof window !== "undefined" && window.innerHeight
                ? window.innerHeight
                : 900;
        const rowsPerColumn = Math.max(
            1,
            Math.floor(viewportHeight / rowHeightPx)
        );
        // Fixed thumbnail width (4 columns → up to 3 columns in 12-col grid)
        const thumbnailGridWidth = 4;
        // Map component id → thumbnail index
        const thumbnailIds = components
            .filter((c) => {
                const mode =
                    !isEditMode && lockedViewMode[c.id]
                        ? lockedViewMode[c.id]
                        : c.displayMode;
                return mode === "thumbnail";
            })
            .map((c) => c.id);
        const thumbnailIndexById = new Map<string, number>();
        thumbnailIds.forEach((id, idx) => thumbnailIndexById.set(id, idx));

        // Helper to compute effective mode in locked vs edit
        const getEffectiveMode = (compId: string, savedMode?: DisplayMode) => {
            if (!isEditMode && lockedViewMode[compId])
                return lockedViewMode[compId];
            return savedMode;
        };

        return components.map((comp) => {
            const meta = componentInventory.getComponent(comp.componentId);
            const effectiveMode = getEffectiveMode(comp.id, comp.displayMode);
            console.log(
                `🔧 Generating layout for ${comp.id}: mode=${effectiveMode}, x=${comp.x}, y=${comp.y}, w=${comp.w}, h=${comp.h}`
            );

            // Calculate final size and position
            let finalX = comp.x;
            let finalY = comp.y;
            let finalWidth = comp.w;
            let finalHeight = comp.h;

            if (effectiveMode === "thumbnail") {
                const tIndex = thumbnailIndexById.get(comp.id) ?? 0;
                const column = Math.floor(tIndex / rowsPerColumn);
                const row = tIndex % rowsPerColumn;
                finalX = column * thumbnailGridWidth;
                finalY = row; // each thumbnail is 1 row tall
                finalWidth = thumbnailGridWidth;
                finalHeight = 1;
            } else if (effectiveMode === "medium") {
                // Prefer original CosmosDB dimensions; if invalid (e.g., saved as thumbnail h=1),
                // fall back to component defaults for a sensible medium size.
                finalWidth = comp.originalW;
                finalHeight = comp.originalH;
                if (finalHeight <= 1) {
                    finalWidth = meta?.defaultSize?.w || 6;
                    finalHeight = meta?.defaultSize?.h || 5;
                }
                console.log(
                    `📐 Medium mode layout: ${comp.id} using original dimensions ${finalWidth}x${finalHeight}`
                );
            }

            return {
                i: comp.id,
                x: finalX,
                y: finalY,
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
    }, [components, isEditMode, lockedViewMode]);

    // Force layout initialization when components change (simplified to prevent infinite loops)
    useEffect(() => {
        if (components.length > 0 && generateLayout.length > 0) {
            console.log("🔧 Force initializing layout with:", generateLayout);
            // Single resize event to trigger layout recalculation
            setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
            }, 100);
        }
    }, [components.length]); // Only depend on component count, not full component data

    // Memoize grid children to prevent hook order violations
    const gridChildren = useMemo(
        () =>
            components.map((instance) => {
                const effectiveMode =
                    !isEditMode && lockedViewMode[instance.id]
                        ? lockedViewMode[instance.id]
                        : instance.displayMode || "medium";
                const meta = componentInventory.getComponent(
                    instance.componentId
                );

                if (fullScreenId && instance.id !== fullScreenId) {
                    // Hide other components while full-screen is active
                    return null;
                }
                const title =
                    componentInventory.getComponent(instance.componentId)
                        ?.displayName || "Component";
                const isThumb = effectiveMode === "thumbnail";
                // Derive rows/cols for visual sizing so locked-mode medium doesn't stick at 1
                const visualRows = isThumb
                    ? 1
                    : instance.h > 1
                    ? instance.h
                    : instance.originalH > 1
                    ? instance.originalH
                    : meta?.defaultSize?.h || 5;
                const visualCols = isThumb
                    ? instance.w
                    : instance.w > 1
                    ? instance.w
                    : instance.originalW > 1
                    ? instance.originalW
                    : meta?.defaultSize?.w || 6;
                return (
                    <div
                        key={instance.id}
                        className="grid-item" // Better control class
                        data-grid-key={`${instance.id}-${effectiveMode}`}
                        data-display-mode={effectiveMode}
                        data-edit-mode={isEditMode}
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
                                height: isThumb
                                    ? "56px" // Standard thumbnail height (2 grid units) - same in edit and non-edit mode
                                    : `${visualRows * 60}px`,
                                minHeight: isThumb
                                    ? "56px" // Standard thumbnail height (2 grid units) - same in edit and non-edit mode
                                    : `${visualRows * 60}px`,
                                // Force width using CSS variable - ALWAYS use current w from CosmosDB
                                "--grid-item-width": isThumb
                                    ? `calc(4 * (100% / 12))` // Standard thumbnail width (4 grid units) - same in edit and non-edit mode
                                    : `calc(${visualCols} * (100% / 12))`,
                                // Force height using CSS variable - ALWAYS use current h from CosmosDB
                                "--grid-item-height": isThumb
                                    ? "56px" // Standard thumbnail height (2 grid units) - same in edit and non-edit mode
                                    : `${visualRows * 60}px`,
                            } as React.CSSProperties & {
                                "--grid-item-width": string;
                                "--grid-item-height": string;
                            }
                        }
                    >
                        {/* Header: only visible in thumbnail mode; in medium we float controls */}
                        {isThumb ? (
                            <div
                                className="drag-handle"
                                style={{
                                    height: isMobilePortrait ? "48px" : "56px", // Compact height for mobile portrait
                                    background: `linear-gradient(to right, ${currentTheme.primary}10, transparent)`,
                                    borderBottom: "none",
                                    borderRadius: "4px",
                                    display: "flex",
                                    flexDirection: isMobilePortrait ? "column" : "row",
                                    alignItems: isMobilePortrait ? "stretch" : "center",
                                    justifyContent: "space-between",
                                    padding: isMobilePortrait ? "4px 8px" : "0 8px",
                                    userSelect: "none",
                                    cursor: isEditMode ? "move" : "auto",
                                }}
                            >
                                {/* Title row - always visible */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        height: isMobilePortrait ? "20px" : "auto",
                                        minHeight: isMobilePortrait ? "20px" : "24px",
                                    }}
                                >
                                    {/* Title field for thumbnail components */}
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            value={instance.customTitle || title}
                                            onChange={(e) => {
                                                const newTitle = e.target.value;
                                                setComponents((prev) =>
                                                    prev.map((comp) =>
                                                        comp.id === instance.id
                                                            ? {
                                                                  ...comp,
                                                                  customTitle:
                                                                      newTitle,
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
                                            onFocus={(e) => {
                                                // Prevent focus if somehow this gets called in locked mode
                                                if (!isEditMode) {
                                                    e.target.blur();
                                                }
                                            }}
                                            style={{
                                                fontSize: isMobilePortrait ? "10px" : "12px",
                                                fontWeight: 600,
                                                color: currentTheme.text,
                                                background: "transparent",
                                                border: "none",
                                                outline: "none",
                                                padding: isMobilePortrait ? "2px 4px" : "4px 8px",
                                                borderRadius: "4px",
                                                minWidth: isMobilePortrait ? "80px" : "120px",
                                                maxWidth: isMobilePortrait ? "120px" : "200px",
                                                cursor: "text",
                                                height: isMobilePortrait ? "18px" : "auto",
                                            }}
                                            placeholder="Enter title..."
                                        />
                                    ) : (
                                        <div
                                            title="Unlock to edit title"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            style={{
                                                fontSize: isMobilePortrait ? "10px" : "12px",
                                                fontWeight: 600,
                                                color: currentTheme.text,
                                                background: "transparent",
                                                display: "flex",
                                                alignItems: "center",
                                                height: isMobilePortrait ? "18px" : "24px",
                                                lineHeight: 1,
                                                padding: isMobilePortrait ? "0 4px" : "0 8px",
                                                borderRadius: "4px",
                                                minWidth: isMobilePortrait ? "80px" : "120px",
                                                maxWidth: isMobilePortrait ? "120px" : "200px",
                                                cursor: "default",
                                                userSelect: "none",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            {instance.customTitle ||
                                                title ||
                                                "Enter title..."}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Controls row - always visible, compact in mobile portrait */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: isMobilePortrait ? 2 : 4,
                                        alignItems: "center",
                                        justifyContent: isMobilePortrait ? "center" : "flex-end",
                                        height: isMobilePortrait ? "20px" : "28px",
                                        maxHeight: isMobilePortrait ? "20px" : "28px",
                                        lineHeight: 0,
                                        marginTop: isMobilePortrait ? "4px" : "0",
                                    }}
                                >
                                    {/* Always show M and F controls */}
                                    <button
                                        className="no-drag"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDisplayMode(
                                                instance.id,
                                                "medium"
                                            );
                                        }}
                                        style={{
                                            height: isMobilePortrait ? 20 : 24,
                                            minHeight: isMobilePortrait ? 20 : 24,
                                            maxHeight: isMobilePortrait ? 20 : 24,
                                            width: isMobilePortrait ? 20 : 24,
                                            minWidth: isMobilePortrait ? 20 : 24,
                                            maxWidth: isMobilePortrait ? 20 : 24,
                                            padding: 0,
                                            fontSize: isMobilePortrait ? 10 : 12,
                                            lineHeight: 1,
                                            border: `1px solid ${currentTheme.border}`,
                                            background: "transparent",
                                            color: currentTheme.text,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            boxSizing: "border-box",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            aspectRatio: "1 / 1",
                                            flex: "0 0 auto",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                        title="Medium"
                                    >
                                        <svg
                                            width={isMobilePortrait ? 12 : 14}
                                            height={isMobilePortrait ? 12 : 14}
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
                                            setDisplayMode(
                                                instance.id,
                                                "full"
                                            );
                                        }}
                                        style={{
                                            height: isMobilePortrait ? 20 : 24,
                                            minHeight: isMobilePortrait ? 20 : 24,
                                            maxHeight: isMobilePortrait ? 20 : 24,
                                            width: isMobilePortrait ? 20 : 24,
                                            minWidth: isMobilePortrait ? 20 : 24,
                                            maxWidth: isMobilePortrait ? 20 : 24,
                                            padding: 0,
                                            fontSize: isMobilePortrait ? 10 : 12,
                                            lineHeight: 1,
                                            border: `1px solid ${currentTheme.border}`,
                                            background: "transparent",
                                            color: currentTheme.text,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            boxSizing: "border-box",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            aspectRatio: "1 / 1",
                                            flex: "0 0 auto",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                        title="Fullscreen"
                                    >
                                        <svg
                                            width={isMobilePortrait ? 12 : 14}
                                            height={isMobilePortrait ? 12 : 14}
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
                                    
                                    {/* T button only in edit mode */}
                                    {isEditMode && (
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "thumbnail"
                                                );
                                            }}
                                            style={{
                                                height: isMobilePortrait ? 20 : 24,
                                                minHeight: isMobilePortrait ? 20 : 24,
                                                maxHeight: isMobilePortrait ? 20 : 24,
                                                width: isMobilePortrait ? 20 : 24,
                                                minWidth: isMobilePortrait ? 20 : 24,
                                                maxWidth: isMobilePortrait ? 20 : 24,
                                                padding: 0,
                                                fontSize: isMobilePortrait ? 10 : 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flex: "0 0 auto",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            title="Thumbnail"
                                        >
                                            <svg
                                                width={isMobilePortrait ? 12 : 14}
                                                height={isMobilePortrait ? 12 : 14}
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
                                    )}
                                </div>
                                
                                {/* Legacy edit mode controls - hidden in mobile portrait */}
                                {isEditMode && !isMobilePortrait ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 4,
                                            alignItems: "center",
                                            height: 28,
                                            maxHeight: 28,
                                            lineHeight: 0,
                                        }}
                                    >
                                        {/* Thumbnail mode button */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "thumbnail"
                                                );
                                            }}
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flex: "0 0 24px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            onLoad={(e) => {
                                                const button =
                                                    e.target as HTMLButtonElement;
                                                const computedStyle =
                                                    window.getComputedStyle(
                                                        button
                                                    );
                                                console.log(
                                                    "🔍 T Button Debug:",
                                                    {
                                                        element: button,
                                                        height: computedStyle.height,
                                                        minHeight:
                                                            computedStyle.minHeight,
                                                        maxHeight:
                                                            computedStyle.maxHeight,
                                                        padding:
                                                            computedStyle.padding,
                                                        fontSize:
                                                            computedStyle.fontSize,
                                                        lineHeight:
                                                            computedStyle.lineHeight,
                                                        boxSizing:
                                                            computedStyle.boxSizing,
                                                        display:
                                                            computedStyle.display,
                                                        actualHeight:
                                                            button.offsetHeight,
                                                        actualWidth:
                                                            button.offsetWidth,
                                                    }
                                                );
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    const computedStyle =
                                                        window.getComputedStyle(
                                                            el
                                                        );
                                                    console.log(
                                                        "🔍 T Button Debug (ref):",
                                                        {
                                                            element: el,
                                                            height: computedStyle.height,
                                                            minHeight:
                                                                computedStyle.minHeight,
                                                            maxHeight:
                                                                computedStyle.maxHeight,
                                                            padding:
                                                                computedStyle.padding,
                                                            fontSize:
                                                                computedStyle.fontSize,
                                                            lineHeight:
                                                                computedStyle.lineHeight,
                                                            boxSizing:
                                                                computedStyle.boxSizing,
                                                            display:
                                                                computedStyle.display,
                                                            actualHeight:
                                                                el.offsetHeight,
                                                            actualWidth:
                                                                el.offsetWidth,
                                                        }
                                                    );
                                                }
                                            }}
                                            title="Thumbnail"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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
                                        {/* Medium mode button */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "medium"
                                                );
                                            }}
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    const computedStyle =
                                                        window.getComputedStyle(
                                                            el
                                                        );
                                                    console.log(
                                                        "🔍 M Button Debug (ref):",
                                                        {
                                                            element: el,
                                                            height: computedStyle.height,
                                                            minHeight:
                                                                computedStyle.minHeight,
                                                            maxHeight:
                                                                computedStyle.maxHeight,
                                                            padding:
                                                                computedStyle.padding,
                                                            fontSize:
                                                                computedStyle.fontSize,
                                                            lineHeight:
                                                                computedStyle.lineHeight,
                                                            boxSizing:
                                                                computedStyle.boxSizing,
                                                            display:
                                                                computedStyle.display,
                                                            actualHeight:
                                                                el.offsetHeight,
                                                            actualWidth:
                                                                el.offsetWidth,
                                                        }
                                                    );
                                                }
                                            }}
                                            title="Medium"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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
                                        {/* Fullscreen button */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFullScreenId(instance.id);
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    const computedStyle =
                                                        window.getComputedStyle(
                                                            el
                                                        );
                                                    console.log(
                                                        "🔍 F Button Debug (ref):",
                                                        {
                                                            element: el,
                                                            height: computedStyle.height,
                                                            minHeight:
                                                                computedStyle.minHeight,
                                                            maxHeight:
                                                                computedStyle.maxHeight,
                                                            padding:
                                                                computedStyle.padding,
                                                            fontSize:
                                                                computedStyle.fontSize,
                                                            lineHeight:
                                                                computedStyle.lineHeight,
                                                            boxSizing:
                                                                computedStyle.boxSizing,
                                                            display:
                                                                computedStyle.display,
                                                            actualHeight:
                                                                el.offsetHeight,
                                                            actualWidth:
                                                                el.offsetWidth,
                                                        }
                                                    );
                                                }
                                            }}
                                            title="Fullscreen"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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

                                        {/* Remove button for thumbnail components */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeComponent(instance.id);
                                            }}
                                            title="Remove"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
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
                                                height: "24px !important",
                                                minHeight: "24px !important",
                                                maxHeight: "24px !important",
                                                padding: "6px 6px !important",
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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
                                            // Leave space on the right for edit controls
                                            right: 240,
                                            height: 20,
                                            cursor: "move",
                                            opacity: 0,
                                            zIndex: 1,
                                        }}
                                    />
                                )}

                                {/* Floating controls in top-right for medium mode */}
                                {!isEditMode ? (
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
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    const computedStyle =
                                                        window.getComputedStyle(
                                                            el
                                                        );
                                                    console.log(
                                                        "🔍 Locked T Button Debug:",
                                                        {
                                                            element: el,
                                                            height: computedStyle.height,
                                                            minHeight:
                                                                computedStyle.minHeight,
                                                            maxHeight:
                                                                computedStyle.maxHeight,
                                                            padding:
                                                                computedStyle.padding,
                                                            fontSize:
                                                                computedStyle.fontSize,
                                                            lineHeight:
                                                                computedStyle.lineHeight,
                                                            boxSizing:
                                                                computedStyle.boxSizing,
                                                            display:
                                                                computedStyle.display,
                                                            actualHeight:
                                                                el.offsetHeight,
                                                            actualWidth:
                                                                el.offsetWidth,
                                                        }
                                                    );
                                                }
                                            }}
                                            title="Thumbnail"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
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
                                        {/* Medium mode button */}
                                        {effectiveMode !== "medium" && (
                                            <button
                                                className="no-drag"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDisplayMode(
                                                        instance.id,
                                                        "medium"
                                                    );
                                                }}
                                                style={{
                                                    height: "24px !important",
                                                    minHeight:
                                                        "24px !important",
                                                    maxHeight:
                                                        "24px !important",
                                                    width: "24px !important",
                                                    minWidth: "24px !important",
                                                    maxWidth: "24px !important",
                                                    padding:
                                                        "6px 6px !important",
                                                    fontSize: "12px !important",
                                                    lineHeight: "1 !important",
                                                    border: `1px solid ${currentTheme.border}`,
                                                    background: "transparent",
                                                    color: currentTheme.text,
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    boxSizing: "border-box",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    aspectRatio: "1 !important",
                                                    flexShrink: "0 !important",
                                                    flexGrow: "0 !important",
                                                    overflow:
                                                        "hidden !important",
                                                    textOverflow:
                                                        "ellipsis !important",
                                                    whiteSpace:
                                                        "nowrap !important",
                                                }}
                                                title="Medium"
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
                                                        y="3"
                                                        width="12"
                                                        height="8"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="3"
                                                        y="5"
                                                        width="8"
                                                        height="4"
                                                        rx="0.5"
                                                        fill="currentColor"
                                                        opacity="0.7"
                                                    />
                                                </svg>
                                            </button>
                                        )}
                                        {effectiveMode !== "full" && (
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "full"
                                                );
                                            }}
                                            title="Full"
                                            style={{
                                                    height: "24px !important",
                                                    minHeight:
                                                        "24px !important",
                                                    maxHeight:
                                                        "24px !important",
                                                    padding:
                                                        "6px 6px !important",
                                                    fontSize: "12px !important",
                                                    lineHeight: "1 !important",
                                                border: `1px solid ${currentTheme.border}`,
                                                    background: "transparent",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                    boxSizing: "border-box",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
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
                                        )}
                                    </div>
                                ) : (
                                    /* Edit mode controls for medium components */
                                    <div
                                        className="no-drag"
                                        style={{
                                            position:
                                                fullScreenId === instance.id
                                                    ? "fixed"
                                                    : "absolute",
                                            top: 8,
                                            right: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            zIndex: 12000,
                                            background: "transparent",
                                            border: "none",
                                            borderRadius: 0,
                                            padding: 0,
                                            pointerEvents: "auto",
                                        }}
                                    >
                                        {/* Thumbnail */}
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
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
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
                                        {/* Medium */}
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
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0 as any,
                                                flexGrow: 0 as any,
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
                                        {/* Fullscreen */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisplayMode(
                                                    instance.id,
                                                    "full"
                                                );
                                            }}
                                            title="Fullscreen"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0 as any,
                                                flexGrow: 0 as any,
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
                                        {/* Edit title input field - positioned just left of thumbnail control */}
                                        <input
                                            type="text"
                                            data-component-id={instance.id}
                                            placeholder="Edit title..."
                                            value={instance.customTitle || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setComponents((prev) =>
                                                    prev.map((c) =>
                                                        c.id === instance.id
                                                            ? {
                                                                  ...c,
                                                                  customTitle:
                                                                      val,
                                                              }
                                                            : c
                                                    )
                                                );
                                            }}
                                            onBlur={() => {
                                                setTimeout(
                                                    () => saveLayoutToTab(),
                                                    100
                                                );
                                            }}
                                            style={{
                                                height: "24px !important",
                                                minHeight: "24px !important",
                                                maxHeight: "24px !important",
                                                padding: "0 6px !important",
                                                fontSize: 12,
                                                lineHeight: 1,
                                                background:
                                                    currentTheme.background,
                                                color: currentTheme.text,
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                minWidth: "120px",
                                                fontSize: "11px",
                                            }}
                                        />
                                        {/* Remove button - positioned after size controls */}
                                        <button
                                            className="no-drag"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeComponent(instance.id);
                                            }}
                                            title="Remove"
                                            style={{
                                                height: 24,
                                                minHeight: 24,
                                                maxHeight: 24,
                                                width: 24,
                                                minWidth: 24,
                                                maxWidth: 24,
                                                padding: 0,
                                                fontSize: 12,
                                                lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                background: "transparent",
                                                color: currentTheme.text,
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                boxSizing: "border-box",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                aspectRatio: "1 / 1",
                                                flexShrink: 0,
                                                flexGrow: 0,
                                            }}
                                        >
                                            ✕
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
                                    width: "100%",
                                    height: "100%",
                                    background: "transparent",
                                    overflow: "auto",
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

                                {/* Explicit resize handles to avoid selecting inner UI while resizing */}
                                {isEditMode && (
                                    <>
                                        <div
                                            className="react-resizable-handle react-resizable-handle-e"
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                right: 0,
                                                width: 14,
                                                height: "100%",
                                                cursor: "e-resize",
                                                zIndex: 10,
                                                pointerEvents: "auto",
                                            }}
                                        />
                                        <div
                                            className="react-resizable-handle react-resizable-handle-s"
                                            style={{
                                                position: "absolute",
                                                left: 0,
                                                bottom: 0,
                                                width: "100%",
                                                height: 14,
                                                cursor: "s-resize",
                                                zIndex: 10,
                                                pointerEvents: "auto",
                                            }}
                                        />
                                    </>
                                )}
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
            editModeVersion,
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

                 /* Force thumbnail mode to be header-only - 2 grid units height for mobile visibility */
         .react-grid-item[data-display-mode="thumbnail"] {
           height: 56px !important; /* 2 grid units = 56px */
           min-height: 56px !important;
           max-height: 56px !important;
           overflow: hidden !important;
         }

         /* Mobile portrait thumbnail - compact height */
         @media (max-width: 768px) and (orientation: portrait) {
           .react-grid-item[data-display-mode="thumbnail"] {
             height: 48px !important; /* Compact height for mobile portrait */
             min-height: 48px !important;
             max-height: 48px !important;
           }
         }

         /* In edit mode, thumbnails maintain standard height - HIGHER SPECIFICITY */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] {
           height: 56px !important; /* Standard thumbnail height (2 grid units) - same in edit and non-edit mode */
           min-height: 56px !important;
           max-height: 56px !important;
           overflow: visible !important;
         }

         /* Force thumbnail sizing in edit mode - EVEN HIGHER SPECIFICITY */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] .grid-item {
           height: 56px !important; /* Standard thumbnail height (2 grid units) - same in edit and non-edit mode */
           min-height: 56px !important;
           max-height: 56px !important;
           overflow: visible !important;
         }

         /* ULTIMATE OVERRIDE for thumbnail edit mode */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"],
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] *:not(.no-drag):not(button) {
           height: 56px !important; /* Standard thumbnail height (2 grid units) - same in edit and non-edit mode */
           min-height: 56px !important;
           max-height: 56px !important;
         }



         /* Ensure thumbnail controls are visible in edit mode */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] .no-drag {
           display: flex !important;
           visibility: visible !important;
           opacity: 1 !important;
           z-index: 9999 !important;
         }

         /* FORCE THUMBNAIL EDIT MODE BUTTONS TO BE SQUARE - MAXIMUM SPECIFICITY */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] .no-drag {
           height: 24px !important;
           min-height: 24px !important;
           max-height: 24px !important;
           width: 24px !important;
           min-width: 24px !important;
           max-width: 24px !important;
           padding: 0 !important;
           font-size: 12px !important;
           line-height: 1 !important;
           box-sizing: border-box !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           overflow: hidden !important;
           text-overflow: ellipsis !important;
           white-space: nowrap !important;
           aspect-ratio: 1 / 1 !important;
           flex-shrink: 0 !important;
           flex-grow: 0 !important;
         }

         /* ULTRA SPECIFIC - Target buttons by their SVG content */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] button.no-drag {
           height: 24px !important;
           min-height: 24px !important;
           max-height: 24px !important;
           width: 24px !important;
           min-width: 24px !important;
           max-width: 24px !important;
           padding: 0 !important;
           font-size: 12px !important;
           line-height: 1 !important;
           box-sizing: border-box !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           overflow: hidden !important;
           text-overflow: ellipsis !important;
           white-space: nowrap !important;
           aspect-ratio: 1 / 1 !important;
           flex-shrink: 0 !important;
           flex-grow: 0 !important;
         }

         /* NUCLEAR OPTION - Force all button elements to be square */
         .react-grid-item[data-display-mode="thumbnail"][data-edit-mode="true"] button {
           height: 24px !important;
           min-height: 24px !important;
           max-height: 24px !important;
           width: 24px !important;
           min-width: 24px !important;
           max-width: 24px !important;
           padding: 0 !important;
           font-size: 12px !important;
           line-height: 1 !important;
           box-sizing: border-box !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           overflow: hidden !important;
           text-overflow: ellipsis !important;
           white-space: nowrap !important;
           aspect-ratio: 1 / 1 !important;
           flex-shrink: 0 !important;
           flex-grow: 0 !important;
           border-radius: 4px !important;
           border: 1px solid var(--quantum-border) !important;
           background: transparent !important;
           font-weight: 500 !important;
           font-family: inherit !important;
           cursor: pointer !important;
           transition: none !important;
           box-shadow: inset 0 0 0 1px var(--quantum-border) !important;
         }

         /* ULTRA NUCLEAR - Remove ALL red backgrounds from ALL buttons */
         .react-grid-item button,
         .react-grid-item .no-drag,
         .react-grid-item button.no-drag {
           background: transparent !important;
           background-color: transparent !important;
         }

         /* FINAL HAMMER: ensure toolbar buttons inside drag-handle are perfect squares */
         .drag-handle button.no-drag {
           height: 24px !important;
           min-height: 24px !important;
           max-height: 24px !important;
           width: 24px !important;
           min-width: 24px !important;
           max-width: 24px !important;
           padding: 6px 6px !important;
           aspect-ratio: 1 !important;
           line-height: 1 !important;
           box-sizing: border-box !important;
           display: flex !important;
           align-items: center !important;
           justify-content: center !important;
           flex-shrink: 0 !important;
           flex-grow: 0 !important;
         }

         /* Force medium and full modes to respect CosmosDB height */
         .react-grid-item[data-display-mode="medium"],
         .react-grid-item[data-display-mode="full"] {
           height: var(--grid-item-height, auto) !important;
           min-height: var(--grid-item-height, auto) !important;
           max-height: var(--grid-item-height, auto) !important;
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





        /* In edit mode, restrict internal interactions to edit UI only */
        ${
            isEditMode
                ? `
          .grid-item * { pointer-events: none !important; }
          .grid-item .no-drag,
          .grid-item .drag-handle,
          .grid-item select,
          .grid-item button,
          .grid-item input,
          .grid-item .react-resizable-handle,
          .grid-item button.remove-component { pointer-events: auto !important; }

          /* Make side/bottom resize handles larger and clickable */
          .react-grid-item > .react-resizable-handle-e,
          .react-grid-item > .react-resizable-handle-s,
          .react-grid-item > .react-resizable-handle-se {
            width: 14px !important;
            height: 14px !important;
            opacity: 0.9 !important;
          }
          .react-grid-item > .react-resizable-handle-e { right: 0; top: 50%; margin-top: -7px; cursor: e-resize; }
          .react-grid-item > .react-resizable-handle-s { bottom: 0; left: 50%; margin-left: -7px; cursor: s-resize; }
          .react-grid-item > .react-resizable-handle-se { right: 0; bottom: 0; cursor: se-resize; }

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

          /* REACT COMPONENT BUTTON OVERRIDES - MAXIMUM PRIORITY */
          button.no-drag[title="Thumbnail"],
          button.no-drag[title="Medium"],
          button.no-drag[title="Fullscreen"],
          button.no-drag[title="Remove"] {
            width: 24px !important;
            height: 24px !important;
            min-width: 24px !important;
            max-width: 24px !important;
            min-height: 24px !important;
            max-height: 24px !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 1px solid rgb(58, 54, 50) !important;
            box-sizing: border-box !important;
            aspect-ratio: 1 / 1 !important;
            flex: 0 0 24px !important;
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            color: rgb(248, 246, 240) !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            line-height: 1 !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
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
                                    key={`grid-${containerWidth || "auto"}-${
                                        components.length
                                    }-${JSON.stringify(
                                        components.map((c) => ({
                                            id: c.id,
                                            x: c.x,
                                            y: c.y,
                                            w: c.w,
                                            h: c.h,
                                        }))
                                    )}`} // Force re-render when components change
                                    className={`layout ${
                                        isLayoutReady ? "layout-ready" : ""
                                    }`}
                                    layouts={{
                                        lg: generateLayout,
                                        md: generateLayout,
                                        sm: generateLayout,
                                        xs: generateLayout,
                                        xxs: generateLayout,
                                    }}
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
                                    resizeHandles={["e", "s", "se"]}
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

                            {enableFullOverlay &&
                                fullScreenId &&
                                fullScreenInstance && (
                                    <div
                                        ref={(el) => {
                                            if (el) {
                                                const rect =
                                                    el.getBoundingClientRect();
                                                const cs =
                                                    window.getComputedStyle(el);
                                                console.log(
                                                    "[FullOverlay] rect:",
                                                    rect.width,
                                                    rect.height,
                                                    "pointerEvents:",
                                                    cs.pointerEvents,
                                                    "position:",
                                                    cs.position
                                                );
                                                setTimeout(() => {
                                                    const rect2 =
                                                        el.getBoundingClientRect();
                                                    console.log(
                                                        "[FullOverlay:post] rect:",
                                                        rect2.width,
                                                        rect2.height
                                                    );
                                                }, 50);
                                            }
                                        }}
                                    style={{
                                            position: "fixed",
                                        inset: 0,
                                            background: "transparent",
                                            border: "none",
                                            borderRadius: 0,
                                            padding: 0,
                                            zIndex: 10000,
                                            pointerEvents: "none",
                                        }}
                                    >
                                        <div
                                            ref={(el) => {
                                                if (el) {
                                                    const rect =
                                                        el.getBoundingClientRect();
                                                    const cs =
                                                        window.getComputedStyle(
                                                            el
                                                        );
                                                    console.log(
                                                        "[FullContent] rect:",
                                                        rect.width,
                                                        rect.height,
                                                        "overflow:",
                                                        cs.overflow,
                                                        "position:",
                                                        cs.position
                                                    );
                                                    setTimeout(() => {
                                                        const rect2 =
                                                            el.getBoundingClientRect();
                                                        console.log(
                                                            "[FullContent:post] rect:",
                                                            rect2.width,
                                                            rect2.height
                                                        );
                                                    }, 50);
                                                    window.requestAnimationFrame(
                                                        () => {
                                                            const rect3 =
                                                                el.getBoundingClientRect();
                                                            console.log(
                                                                "[FullContent:raf] rect:",
                                                                rect3.width,
                                                                rect3.height
                                                            );
                                                        }
                                                    );
                                                }
                                            }}
                                            style={{
                                                position: "fixed",
                                                top: 48,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                width: "100vw",
                                                height: "calc(100vh - 48px)",
                                                background: "transparent",
                                                overflow: "auto",
                                                pointerEvents: "auto",
                                            }}
                                        >
                                            <div
                                                ref={(el) => {
                                                    if (el) {
                                                        const rect =
                                                            el.getBoundingClientRect();
                                                        const cs =
                                                            window.getComputedStyle(
                                                                el
                                                            );
                                                        console.log(
                                                            "[FullInner] rect:",
                                                            rect.width,
                                                            rect.height,
                                                            "display:",
                                                            cs.display
                                                        );
                                                    }
                                                }}
                                                style={{
                                                    position: "relative",
                                                    width: "100%",
                                                    height: "100%",
                                        display: "flex",
                                                    alignItems: "stretch",
                                    }}
                                >
                                    {/* Absolute controls aligned with host header; remove extra internal header spacing */}
                                    <div
                                        className="no-drag"
                                        style={{
                                            position: "absolute",
                                                        top: 12,
                                                        right: 12,
                                            height: 30,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                                        zIndex: 12001,
                                                        pointerEvents: "auto",
                                        }}
                                    >
                                                    {/* Buttons always shown to exit fullscreen (both modes) */}
                                        <button
                                            onClick={() => {
                                                setDisplayMode(
                                                    fullScreenInstance.id,
                                                    "thumbnail"
                                                );
                                                            setFullScreenId(
                                                                null
                                                            );
                                            }}
                                            title="Thumbnail"
                                            style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                setDisplayMode(
                                                    fullScreenInstance.id,
                                                    "medium"
                                                );
                                                            setFullScreenId(
                                                                null
                                                            );
                                            }}
                                            title="Medium"
                                            style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                border: `1px solid ${currentTheme.border}`,
                                                borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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

                                                    {/* Edit-mode-only controls: Full + Title + Remove */}
                                                    {isEditMode && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setDisplayMode(
                                                                        fullScreenInstance.id,
                                                                        "full"
                                                                    );
                                                                }}
                                                                title="Full"
                                                                style={{
                                                                    height: "24px !important",
                                                                    minHeight:
                                                                        "24px !important",
                                                                    maxHeight:
                                                                        "24px !important",
                                                                    padding:
                                                                        "6px 6px !important",
                                                                    fontSize:
                                                                        "12px !important",
                                                                    lineHeight:
                                                                        "1 !important",
                                                                    border: `1px solid ${currentTheme.border}`,
                                                                    background:
                                                                        "transparent",
                                                                    borderRadius: 4,
                                                                    color: currentTheme.text,
                                                                    cursor: "pointer",
                                                                    boxSizing:
                                                                        "border-box",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
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

                                                            <input
                                                                type="text"
                                                                data-component-id={
                                                                    fullScreenInstance.id
                                                                }
                                                                placeholder="Edit title..."
                                                                value={
                                                                    fullScreenInstance.customTitle ||
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    const val =
                                                                        e.target
                                                                            .value;
                                                                    setComponents(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    c
                                                                                ) =>
                                                                                    c.id ===
                                                                                    fullScreenInstance.id
                                                                                        ? {
                                                                                              ...c,
                                                                                              customTitle:
                                                                                                  val,
                                                                                          }
                                                                                        : c
                                                                            )
                                                                    );
                                                                }}
                                                                onBlur={() => {
                                                                    setTimeout(
                                                                        () =>
                                                                            saveLayoutToTab(),
                                                                        100
                                                                    );
                                                                }}
                                                                style={{
                                                                    height: "24px !important",
                                                                    minHeight:
                                                                        "24px !important",
                                                                    maxHeight:
                                                                        "24px !important",
                                                                    padding:
                                                                        "0 6px !important",
                                                                    fontSize:
                                                                        "12px !important",
                                                                    lineHeight:
                                                                        "1 !important",
                                                                    background:
                                                                        currentTheme.background,
                                                                    color: currentTheme.text,
                                                                    border: `1px solid ${currentTheme.border}`,
                                                                    borderRadius: 4,
                                                                    minWidth:
                                                                        "120px",
                                                                }}
                                                            />

                                                            <button
                                                                className="no-drag"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    removeComponent(
                                                                        fullScreenInstance.id
                                                                    );
                                                                }}
                                                                title="Remove"
                                                                style={{
                                                                    height: "24px !important",
                                                                    minHeight:
                                                                        "24px !important",
                                                                    maxHeight:
                                                                        "24px !important",
                                                                    padding:
                                                                        "6px 6px !important",
                                                                    fontSize:
                                                                        "12px !important",
                                                                    lineHeight:
                                                                        "1 !important",
                                                                    border: `1px solid ${currentTheme.border}`,
                                                                    background:
                                                                        "transparent",
                                                                    color: currentTheme.text,
                                                                    borderRadius: 4,
                                                                    cursor: "pointer",
                                                                    boxSizing:
                                                                        "border-box",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* Fullscreen component content */}
                                    <div
                                        style={{
                                            flex: 1,
                                                            minHeight: 0,
                                                            position:
                                                                "relative",
                                                            width: "100%",
                                                            height: "100%",
                                                            background:
                                                                "transparent",
                                                            overflow: "auto",
                                        }}
                                    >
                                        <ComponentRenderer
                                            componentId={
                                                fullScreenInstance.componentId
                                            }
                                                            instanceId={
                                                                fullScreenInstance.id
                                                            }
                                            props={
                                                                fullScreenInstance.props ||
                                                                {}
                                            }
                                                            isEditMode={
                                                                isEditMode
                                                            }
                                            onRemove={() =>
                                                removeComponent(
                                                    fullScreenInstance.id
                                                )
                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {!enableFullOverlay &&
                                fullScreenId &&
                                fullScreenInstance && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            overflow: "auto",
                                            background: "transparent",
                                            zIndex: 1,
                                            pointerEvents: "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "relative",
                                                width: "100%",
                                                height: "100%",
                                                display: "flex",
                                                alignItems: "stretch",
                                            }}
                                        >
                                            {/* Locked-mode controls in fullscreen fallback: show T, M, and F */}
                                            {!isEditMode && (
                                                <div
                                                    className="no-drag"
                                                    style={{
                                                        position: "absolute",
                                                        top: 12,
                                                        right: 12,
                                                        height: 30,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        zIndex: 12001,
                                                        pointerEvents: "auto",
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "thumbnail"
                                                            );
                                                            setFullScreenId(
                                                                null
                                                            );
                                                        }}
                                                        title="Thumbnail"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "medium"
                                                            );
                                                            setFullScreenId(
                                                                null
                                                            );
                                                        }}
                                                        title="Medium"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                        onClick={() => {
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "full"
                                                            );
                                                            setFullScreenId(
                                                                null
                                                            );
                                                        }}
                                                        title="Fullscreen"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                            <path d="M1 1h4v2H3v2H1V1zM13 1h-4v2h2v2h2V1zM1 13h4v-2H3V9H1v4zM13 13h-4v-2h2V9h2v4z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Edit-mode controls in fullscreen fallback: show T, M, F + title + X */}
                                            {isEditMode && (
                                                <div
                                                    className="no-drag"
                                                    style={{
                                                        position: "absolute",
                                                        top: 12,
                                                        right: 12,
                                                        height: 30,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        zIndex: 12002,
                                                        pointerEvents: "auto",
                                                    }}
                                                >
                                                    {/* T */}
                                                    <button
                                                        onClick={() => {
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "thumbnail"
                                                            );
                                                            setFullScreenId(
                                                                null
                                                            );
                                                        }}
                                                        title="Thumbnail"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                    {/* M */}
                                                    <button
                                                        onClick={() => {
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "medium"
                                                            );
                                                            setFullScreenId(
                                                                null
                                                            );
                                                        }}
                                                        title="Medium"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                    {/* F */}
                                                    <button
                                                        onClick={() => {
                                                            setDisplayMode(
                                                                fullScreenInstance.id,
                                                                "full"
                                                            );
                                                        }}
                                                        title="Full"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            background:
                                                                "transparent",
                                                            borderRadius: 4,
                                                            color: currentTheme.text,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
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
                                                    {/* Title */}
                                                    <input
                                                        type="text"
                                                        data-component-id={
                                                            fullScreenInstance.id
                                                        }
                                                        placeholder="Edit title..."
                                                        value={
                                                            fullScreenInstance.customTitle ||
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            const val =
                                                                e.target.value;
                                                            setComponents(
                                                                (prev) =>
                                                                    prev.map(
                                                                        (c) =>
                                                                            c.id ===
                                                        fullScreenInstance.id
                                                            ? {
                                                                                      ...c,
                                                                                      customTitle:
                                                                                          val,
                                                              }
                                                                                : c
                                                    )
                                                );
                                                        }}
                                                        onBlur={() => {
                                                setTimeout(
                                                                () =>
                                                                    saveLayoutToTab(),
                                                    100
                                                );
                                            }}
                                                        style={{
                                                            height: "24px !important",
                                                            minHeight:
                                                                "24px !important",
                                                            maxHeight:
                                                                "24px !important",
                                                            padding:
                                                                "0 6px !important",
                                                            fontSize:
                                                                "12px !important",
                                                            lineHeight:
                                                                "1 !important",
                                                            background:
                                                                currentTheme.background,
                                                            color: currentTheme.text,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            borderRadius: 4,
                                                            minWidth: "120px",
                                                        }}
                                                    />
                                                    {/* X */}
                                                    <button
                                                        className="no-drag"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeComponent(
                                                                fullScreenInstance.id
                                                            );
                                                        }}
                                                        title="Remove"
                                                        style={{
                                                            height: 24,
                                                            minHeight: 24,
                                                            maxHeight: 24,
                                                            width: 24,
                                                            minWidth: 24,
                                                            maxWidth: 24,
                                                            padding: 0,
                                                            fontSize: 12,
                                                            lineHeight: 1,
                                                            border: `1px solid ${currentTheme.border}`,
                                                            background:
                                                                "transparent",
                                                            color: currentTheme.text,
                                                            borderRadius: 4,
                                                            cursor: "pointer",
                                                            boxSizing:
                                                                "border-box",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                            <div
                                                style={{
                                                    flex: 1,
                                                    minHeight: 0,
                                                    pointerEvents: "auto",
                                                }}
                                            >
                                                <ComponentRenderer
                                                    componentId={
                                                        fullScreenInstance.componentId
                                                    }
                                                    instanceId={
                                                        fullScreenInstance.id
                                                    }
                                                    props={
                                                        fullScreenInstance.props ||
                                                        {}
                                                    }
                                                    isEditMode={isEditMode}
                                                    onRemove={() =>
                                                        removeComponent(
                                                            fullScreenInstance.id
                                                        )
                                                    }
                                                />
                                            </div>
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
