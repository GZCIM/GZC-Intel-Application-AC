import React, { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { componentInventory } from "../../core/components/ComponentInventory";
import { debugLogger, logComponentLoad } from "../../utils/debugLogger";
import { ComponentErrorBoundary } from "../debug/ErrorBoundary";
import { ComponentHeaderWrapper } from "./ComponentHeaderWrapper";

interface ComponentRendererProps {
    componentId: string;
    instanceId: string;
    props?: Record<string, any>;
    isEditMode: boolean;
    onRemove: () => void;
    onPropsUpdate?: (props: Record<string, any>) => void;
    componentState?: "minimized" | "normal" | "maximized";
    onComponentStateChange?: (
        state: "minimized" | "normal" | "maximized"
    ) => void;
}

// Map component IDs to actual components
const componentMap: Record<string, () => Promise<any>> = {
    // GZC Components from port 3200
    "gzc-portfolio": () => import("../gzc-portfolio"),
    "gzc-analytics": () => import("../gzc-analytics"),

    // Bloomberg Volatility Analysis
    "bloomberg-volatility": () => import("../bloomberg-volatility"),

    // Portfolio component
    portfolio: () => import("../portfolio"),

    // Placeholder components - will show the nice placeholder UI for now
    "line-chart": () => Promise.resolve(null),
    "area-chart": () => Promise.resolve(null),
    "candlestick-chart": () => Promise.resolve(null),
    "market-heatmap": () => Promise.resolve(null),
    "order-book": () => Promise.resolve(null),
    "trade-history": () => Promise.resolve(null),
    watchlist: () => Promise.resolve(null),
    "sector-performance": () => Promise.resolve(null),
    "news-feed": () => Promise.resolve(null),
    "market-sentiment": () => Promise.resolve(null),
    "options-chain": () => Promise.resolve(null),
    "correlation-matrix": () => Promise.resolve(null),
    "volatility-surface": () => Promise.resolve(null),
    "market-depth": () => Promise.resolve(null),
    "time-and-sales": () => Promise.resolve(null),
    "technical-indicators": () => Promise.resolve(null),
    "fundamental-data": () => Promise.resolve(null),
    "economic-calendar": () => Promise.resolve(null),
    "earnings-calendar": () => Promise.resolve(null),
    "social-sentiment": () => Promise.resolve(null),
    "risk-metrics": () => Promise.resolve(null),
    "portfolio-optimizer": () => Promise.resolve(null),
    "backtesting-engine": () => Promise.resolve(null),
    "alert-manager": () => Promise.resolve(null),
    "scanner-results": () => Promise.resolve(null),
};

export const ComponentRenderer = React.memo<ComponentRendererProps>(
    ({
        componentId,
        instanceId,
        props = {},
        isEditMode,
        onRemove,
        onPropsUpdate,
        componentState = "normal",
        onComponentStateChange,
    }) => {
        const { currentTheme } = useTheme();
        const [Component, setComponent] =
            useState<React.ComponentType<any> | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);

        const meta = componentInventory.getComponent(componentId);

        useEffect(() => {
            const loadComponent = async () => {
                const startTime = performance.now();
                debugLogger.info(`Starting to load component: ${componentId}`, {
                    componentId,
                    instanceId,
                    hasMapping: !!componentMap[componentId],
                });

                try {
                    setLoading(true);
                    setError(null);

                    if (componentMap[componentId]) {
                        debugLogger.info(
                            `Found component mapping for ${componentId}, attempting dynamic import...`
                        );

                        const module = await componentMap[componentId]();
                        const loadTime = performance.now() - startTime;

                        debugLogger.info(
                            `Module loaded for ${componentId} in ${loadTime.toFixed(
                                2
                            )}ms`,
                            {
                                componentId,
                                loadTime,
                                moduleKeys: module ? Object.keys(module) : null,
                                moduleType: module ? typeof module : "null",
                            }
                        );

                        if (module) {
                            // Handle various export patterns
                            let LoadedComponent = null;
                            const exportChecks = [];

                            // Try different export patterns
                            if (module.default) {
                                exportChecks.push("default");
                                LoadedComponent = module.default;
                            } else if (module.Portfolio) {
                                exportChecks.push("Portfolio");
                                LoadedComponent = module.Portfolio;
                            } else if (module.GZCPortfolioComponent) {
                                exportChecks.push("GZCPortfolioComponent");
                                LoadedComponent = module.GZCPortfolioComponent;
                            } else if (module.AnalyticsDashboard) {
                                exportChecks.push("AnalyticsDashboard");
                                LoadedComponent = module.AnalyticsDashboard;
                            } else if (module.VolatilityAnalysis) {
                                exportChecks.push("VolatilityAnalysis");
                                LoadedComponent = module.VolatilityAnalysis;
                            } else if (typeof module === "function") {
                                exportChecks.push("function");
                                LoadedComponent = module;
                            }

                            debugLogger.info(
                                `Export pattern checks for ${componentId}`,
                                {
                                    exportChecks,
                                    foundComponent: !!LoadedComponent,
                                    moduleExports: Object.keys(module),
                                }
                            );

                            if (LoadedComponent) {
                                setComponent(() => LoadedComponent);
                                logComponentLoad(componentId, true, undefined, {
                                    instanceId,
                                    loadTime,
                                    exportPattern:
                                        exportChecks[exportChecks.length - 1],
                                });
                            } else {
                                const errorMsg = `Component ${componentId} module loaded but no component found`;
                                debugLogger.warn(errorMsg, {
                                    moduleKeys: Object.keys(module),
                                    modulePrototype: module.prototype
                                        ? Object.getOwnPropertyNames(
                                              module.prototype
                                          )
                                        : null,
                                });
                                console.warn(errorMsg, module);
                                setComponent(null);
                                logComponentLoad(
                                    componentId,
                                    false,
                                    new Error(errorMsg),
                                    { instanceId }
                                );
                            }
                        } else {
                            // Component exists but not implemented yet - no error, will show placeholder
                            debugLogger.info(
                                `Component ${componentId} returned null module (placeholder mode)`
                            );
                            setComponent(null);
                            logComponentLoad(componentId, true, undefined, {
                                instanceId,
                                placeholder: true,
                            });
                        }
                    } else {
                        const errorMsg = `No component mapping for: ${componentId}`;
                        debugLogger.error(errorMsg, {
                            availableComponents: Object.keys(componentMap),
                            componentId,
                            instanceId,
                        });
                        setError(errorMsg);
                        logComponentLoad(
                            componentId,
                            false,
                            new Error(errorMsg),
                            { instanceId }
                        );
                    }
                } catch (err) {
                    const loadTime = performance.now() - startTime;
                    const errorMsg = `Failed to load component ${componentId}`;

                    debugLogger.error(
                        errorMsg,
                        {
                            componentId,
                            instanceId,
                            loadTime,
                            errorMessage:
                                err instanceof Error
                                    ? err.message
                                    : String(err),
                            errorStack:
                                err instanceof Error ? err.stack : undefined,
                            errorType:
                                err instanceof Error
                                    ? err.constructor.name
                                    : typeof err,
                        },
                        err instanceof Error ? err : new Error(String(err))
                    );

                    console.error(errorMsg, err);
                    setError(
                        `Failed to load component: ${
                            err instanceof Error ? err.message : String(err)
                        }`
                    );
                    logComponentLoad(
                        componentId,
                        false,
                        err instanceof Error ? err : new Error(String(err)),
                        {
                            instanceId,
                            loadTime,
                        }
                    );
                } finally {
                    setLoading(false);
                }
            };

            loadComponent();
        }, [componentId, instanceId]);

        // Component not found in inventory (show removable placeholder in edit mode)
        if (!meta) {
            return (
                <div
                    onContextMenu={(e) => {
                        if (!isEditMode) return;
                        e.preventDefault();
                        if (confirm("Remove this component from the layout?")) {
                            onRemove?.();
                        }
                    }}
                    style={{
                        height: "100%",
                        width: "100%",
                        backgroundColor: currentTheme.surface,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingBottom: "8px",
                            borderBottom: `1px solid ${currentTheme.border}`,
                        }}
                    >
                        <h4
                            style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: "600",
                                color: currentTheme.text,
                            }}
                        >
                            Missing component: {componentId}
                        </h4>
                        {isEditMode && (
                            <button
                                className="no-drag react-draggable-cancel"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRemove?.();
                                }}
                                title="Remove component"
                                style={{
                                    border: `1px solid ${currentTheme.border}`,
                                    background: "transparent",
                                    color: currentTheme.textSecondary,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    padding: "2px 6px",
                                    cursor: "pointer",
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: "10px",
                            color: currentTheme.textSecondary,
                            fontSize: "12px",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: "28px", opacity: 0.3 }}>❓</div>
                        <div>Component not found: {componentId}</div>
                        {isEditMode && (
                            <div style={{ fontSize: "10px", opacity: 0.7 }}>
                                Right-click or click × to remove this tile
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Loading state
        if (loading) {
            return (
                <div
                    style={{
                        height: "100%",
                        backgroundColor: currentTheme.surface,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: currentTheme.textSecondary,
                    }}
                >
                    Loading {meta.displayName}...
                </div>
            );
        }

        // Error state
        if (error) {
            return (
                <div
                    style={{
                        height: "100%",
                        backgroundColor: currentTheme.surface,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: currentTheme.textSecondary,
                    }}
                >
                    <div style={{ fontSize: "24px", opacity: 0.5 }}>⚠️</div>
                    <div style={{ fontSize: "12px" }}>{error}</div>
                </div>
            );
        }

        // Render actual component if loaded
        if (Component) {
            const rawCustomTitle = (props && (props as any).customTitle) as
                | string
                | undefined;
            const headerTitle =
                rawCustomTitle && rawCustomTitle.trim().length > 0
                    ? rawCustomTitle
                    : meta.displayName;
            // Special-case components: render without shared header and pass inline title
            if (componentId === 'portfolio' || componentId === 'bloomberg-volatility') {
                return (
                    <ComponentErrorBoundary componentName={`${meta.displayName} (${componentId})`} showError={true}>
                        <div style={{ position: 'relative', height: '100%' }}>
                            {/* Edit controls overlay (kept on edit screen) */}
                            {isEditMode && (
                                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 5 }}>
                                    <button
                                        title="Minimize"
                                        onClick={() => onComponentStateChange?.('minimized')}
                                        style={{ padding: '2px 6px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        Min
                                    </button>
                                    <button
                                        title="Normal"
                                        onClick={() => onComponentStateChange?.('normal')}
                                        style={{ padding: '2px 6px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        Norm
                                    </button>
                                    <button
                                        title="Maximize"
                                        onClick={() => onComponentStateChange?.('maximized')}
                                        style={{ padding: '2px 6px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        Max
                                    </button>
                                    <button
                                        title="Edit title"
                                        onClick={() => {
                                            const next = prompt('Enter title', headerTitle || meta.displayName);
                                            if (next != null) {
                                                const nextProps = { ...(props as any), customTitle: next };
                                                onPropsUpdate?.(nextProps);
                                            }
                                        }}
                                        style={{ padding: '2px 6px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        Title
                                    </button>
                                    <button
                                        title="Remove"
                                        onClick={onRemove}
                                        style={{ padding: '2px 6px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#D69A82', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            <Component {...props} title={headerTitle} />
                        </div>
                    </ComponentErrorBoundary>
                );
            }
            return (
                <ComponentErrorBoundary componentName={`${meta.displayName} (${componentId})`} showError={true}>
                    <ComponentHeaderWrapper
                        componentId={componentId}
                        instanceId={instanceId}
                        displayName={headerTitle}
                        defaultName={meta.displayName}
                        componentState={componentState}
                        onComponentStateChange={onComponentStateChange}
                        onTitleChange={(title) => {
                            const nextProps = { ...(props as any), customTitle: title };
                            onPropsUpdate?.(nextProps);
                        }}
                        onRemove={onRemove}
                        dataQuality={95}
                        lastUpdated="2m ago"
                        isEditMode={isEditMode}
                    >
                        <Component {...props} />
                    </ComponentHeaderWrapper>
                </ComponentErrorBoundary>
            );
        }

        // Fallback placeholder (component not implemented yet or not found)
        return (
            <div
                onContextMenu={(e) => {
                    if (!isEditMode) return;
                    e.preventDefault();
                    if (confirm("Remove this component from the layout?")) {
                        onRemove?.();
                    }
                }}
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: currentTheme.surface,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                }}
            >
                {/* Component Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: "8px",
                        borderBottom: `1px solid ${currentTheme.border}`,
                    }}
                >
                    <h4
                        style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: "600",
                            color: currentTheme.text,
                        }}
                    >
                        {meta.displayName}
                    </h4>
                    {isEditMode && (
                        <button
                            className="no-drag react-draggable-cancel"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRemove?.();
                            }}
                            title="Remove component"
                            style={{
                                border: `1px solid ${currentTheme.border}`,
                                background: "transparent",
                                color: currentTheme.textSecondary,
                                borderRadius: 4,
                                fontSize: 12,
                                padding: "2px 6px",
                                cursor: "pointer",
                            }}
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Component Content Placeholder */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: "12px",
                        color: currentTheme.textSecondary,
                        fontSize: "12px",
                    }}
                >
                    <div style={{ fontSize: "32px", opacity: 0.3 }}>🚧</div>
                    <div>{meta.description}</div>
                    <div style={{ fontSize: "10px", opacity: 0.7 }}>
                        Component implementation coming soon
                    </div>
                </div>

                {/* Component Info */}
                <div
                    style={{
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                    }}
                >
                    {meta.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                backgroundColor: `${currentTheme.primary}20`,
                                color: currentTheme.primary,
                                borderRadius: "4px",
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        );
    }
);
