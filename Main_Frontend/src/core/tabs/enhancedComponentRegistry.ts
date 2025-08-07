import { ComponentType } from "react";

// Enhanced component metadata
export interface ComponentMetadata {
    id: string;
    displayName: string;
    category?: "core" | "analytics" | "trading" | "external" | "utility";
    gridConfig?: {
        defaultWidgets?: Array<{
            viewId: string;
            title: string;
            icon: string;
            defaultSize?: { w: number; h: number };
        }>;
    };
}

// Enhanced registry with metadata
export const enhancedComponentRegistry: Record<
    string,
    {
        loader: () => Promise<{ default: ComponentType<any> }>;
        metadata: ComponentMetadata;
    }
> = {
    // Core components
    EmptyTab: {
        loader: () =>
            import("../../components/EmptyTab").then((m) => ({
                default: m.EmptyTab,
            })),
        metadata: {
            id: "EmptyTab",
            displayName: "Empty Tab",
            category: "core",
        },
    },

    TestDashboard: {
        loader: () =>
            import("../../components/TestDashboard").then((m) => ({
                default: m.TestDashboard,
            })),
        metadata: {
            id: "TestDashboard",
            displayName: "Test Dashboard",
            category: "core",
        },
    },

    // Trading components with grid configurations
    Portfolio: {
        loader: () => import("../../components/portfolio/Portfolio"),
        metadata: {
            id: "Portfolio",
            displayName: "Portfolio Manager",
            category: "trading",
            gridConfig: {
                defaultWidgets: [
                    {
                        viewId: "positions",
                        title: "Portfolio Positions",
                        icon: "briefcase",
                    },
                    {
                        viewId: "performance",
                        title: "Performance Metrics",
                        icon: "trending-up",
                    },
                    {
                        viewId: "risk",
                        title: "Risk Analysis",
                        icon: "shield",
                    },
                    {
                        viewId: "allocation",
                        title: "Asset Allocation",
                        icon: "pie-chart",
                    },
                ],
            },
        },
    },

    TradingApp: {
        loader: () => import("../../modules/trading/App"),
        metadata: {
            id: "TradingApp",
            displayName: "Trading Interface",
            category: "trading",
            gridConfig: {
                defaultWidgets: [
                    {
                        viewId: "orderbook",
                        title: "Order Book",
                        icon: "layers",
                    },
                    {
                        viewId: "chart",
                        title: "Price Chart",
                        icon: "bar-chart-2",
                    },
                    {
                        viewId: "trades",
                        title: "Recent Trades",
                        icon: "activity",
                    },
                    {
                        viewId: "order-entry",
                        title: "Order Entry",
                        icon: "send",
                    },
                ],
            },
        },
    },

    // Analytics components
    AnalyticsDashboardExample: {
        loader: () =>
            import("../../components/analytics/AnalyticsDashboardExample"),
        metadata: {
            id: "AnalyticsDashboardExample",
            displayName: "Analytics Dashboard",
            category: "analytics",
        },
    },

    GridAnalyticsDashboard: {
        loader: () =>
            import("../../components/analytics/GridAnalyticsDashboard"),
        metadata: {
            id: "GridAnalyticsDashboard",
            displayName: "Grid Analytics Dashboard",
            category: "analytics",
        },
    },

    // Additional components
    Dashboard: {
        loader: () =>
            import("../../pages/Dashboard").then((m) => ({
                default: m.Dashboard,
            })),
        metadata: {
            id: "Dashboard",
            displayName: "Dashboard",
            category: "core",
        },
    },

    Components: {
        loader: () =>
            import("../../pages/Components").then((m) => ({
                default: m.Components,
            })),
        metadata: {
            id: "Components",
            displayName: "Component Library",
            category: "utility",
        },
    },

    Docs: {
        loader: () =>
            import("../../pages/docs/SetupDocs").then((m) => ({
                default: m.SetupDocs,
            })),
        metadata: {
            id: "Docs",
            displayName: "Documentation",
            category: "utility",
        },
    },
};

// Get component metadata by ID
export function getComponentMetadata(
    componentId: string
): ComponentMetadata | undefined {
    return enhancedComponentRegistry[componentId]?.metadata;
}

// Load component with metadata injection
export async function loadComponentWithMetadata(componentId: string) {
    const entry = enhancedComponentRegistry[componentId];
    if (!entry) {
        throw new Error(`Component ${componentId} not found in registry`);
    }

    const module = await entry.loader();
    const Component = module.default;

    // Inject metadata into the component
    Component.displayName = entry.metadata.displayName;
    (Component as any).__metadata = entry.metadata;

    return Component;
}

// Get all components by category
export function getComponentsByCategory(
    category: ComponentMetadata["category"]
) {
    return Object.entries(enhancedComponentRegistry)
        .filter(([_, entry]) => entry.metadata.category === category)
        .map(([componentId, entry]) => ({
            ...entry.metadata,
            id: componentId,
        }));
}

// Create a registry that's compatible with the old format but includes metadata
export function createLegacyCompatibleRegistry() {
    const registry: Record<
        string,
        () => Promise<{ default: ComponentType<any> }>
    > = {};

    for (const [id, entry] of Object.entries(enhancedComponentRegistry)) {
        registry[id] = async () => {
            const Component = await loadComponentWithMetadata(id);
            return { default: Component };
        };
    }

    return registry;
}
