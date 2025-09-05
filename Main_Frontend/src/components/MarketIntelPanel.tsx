import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { FeatherIcon } from "./icons/FeatherIcon";
import { getVersionString } from "../utils/version";

export const MarketIntelPanel = () => {
    // Collapse by default on mobile or when device override is set to mobile
    // Also collapse on very small height (landscape phones)
    const getInitialCollapsed = () => {
        try {
            const persisted = localStorage.getItem("gzc-leftpanel-collapsed");
            if (persisted === "true") return true;
            const override = localStorage.getItem("gzc-device-override");
            const isMobileOverride = override === "mobile";
            const isSmallScreen =
                typeof window !== "undefined" && window.innerWidth <= 768;
            const isLandscapeCompact =
                typeof window !== "undefined" && window.innerHeight <= 420;
            const isMobileUA =
                typeof navigator !== "undefined" &&
                /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(
                    navigator.userAgent
                );
            return (
                isMobileOverride ||
                isSmallScreen ||
                isLandscapeCompact ||
                isMobileUA
            );
        } catch {
            return (
                typeof window !== "undefined" &&
                (window.innerWidth <= 768 || window.innerHeight <= 420)
            );
        }
    };

    const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed());
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);
    const [isMobileLandscapeCompact, setIsMobileLandscapeCompact] =
        useState(false);
    const userCollapsedRef = React.useRef<boolean | null>(null);
    const { currentTheme: theme } = useTheme();

    // Auto-collapse on small width/height only until the user makes a choice
    React.useEffect(() => {
        const onResize = () => {
            const smallWidth = window.innerWidth <= 768;
            const smallHeight = window.innerHeight <= 420;
            const isPortrait = window.innerHeight > window.innerWidth;
            const isLandscape = window.innerWidth > window.innerHeight;

            // Mobile portrait: either small width OR portrait orientation on mobile device
            const mobilePortrait =
                smallWidth || (isPortrait && window.innerWidth <= 1024);
            let mobileLandscapeCompact =
                smallWidth && smallHeight && isLandscape;
            try {
                const override = localStorage.getItem("gzc-device-override");
                if (
                    override === "mobile" &&
                    window.innerWidth > window.innerHeight
                ) {
                    mobileLandscapeCompact = true;
                }
            } catch {}

            setIsMobilePortrait(mobilePortrait);
            setIsMobileLandscapeCompact(mobileLandscapeCompact);

            // If the user has toggled explicitly, respect that
            if (userCollapsedRef.current !== null) return;
            if (smallWidth || smallHeight) setIsCollapsed(true);
        };

        // Initial check
        onResize();

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // In mobile portrait or compact landscape, when expanded, take over and hide main content
    React.useEffect(() => {
        if (typeof document === "undefined") return;
        const takeover =
            (isMobilePortrait || isMobileLandscapeCompact) && !isCollapsed;
        document.body.classList.toggle("leftpanel-full", takeover);
        return () => {
            document.body.classList.remove("leftpanel-full");
        };
    }, [isMobilePortrait, isMobileLandscapeCompact, isCollapsed]);

    const isTakeover =
        (isMobilePortrait || isMobileLandscapeCompact) && !isCollapsed; // Both mobile orientations take over full screen
    const isMobilePortraitExpanded = isMobilePortrait && !isCollapsed; // Mobile portrait expanded state

    return (
        <div
            className={isMobilePortraitExpanded ? "expanded" : ""}
            style={{
                width: isTakeover
                    ? "100%"
                    : isMobilePortrait
                    ? "100%"
                    : isCollapsed
                    ? "48px"
                    : "280px",
                minWidth: isTakeover
                    ? "100%"
                    : isMobilePortrait
                    ? "100%"
                    : isCollapsed
                    ? "48px"
                    : "280px",
                maxWidth: isTakeover
                    ? "100%"
                    : isMobilePortrait
                    ? "100%"
                    : isCollapsed
                    ? "48px"
                    : "280px",
                height: isTakeover
                    ? "calc(100vh - 88px)"
                    : isMobilePortrait && isCollapsed
                    ? "60px" // Thin row when collapsed on mobile portrait
                    : "calc(100vh - 88px)",
                maxHeight: isTakeover
                    ? "calc(100vh - 88px)"
                    : isMobilePortrait && isCollapsed
                    ? "60px"
                    : "calc(100vh - 88px)",
                backgroundColor: theme.surface,
                borderRight: isTakeover
                    ? "none"
                    : isCollapsed
                    ? "none"
                    : `1px solid ${theme.border}`,
                borderBottom: isTakeover
                    ? isCollapsed
                        ? "none"
                        : `1px solid ${theme.border}`
                    : isMobilePortrait
                    ? `1px solid ${theme.border}` // Bottom border for mobile portrait
                    : "none",
                padding:
                    isMobilePortrait && isCollapsed
                        ? "8px 16px"
                        : isCollapsed
                        ? "16px 8px"
                        : "12px 12px 8px",
                paddingBottom: isCollapsed ? "16px" : "16px", // Consistent padding
                overflowY: isTakeover ? "hidden" : "auto",
                transition: "all 0.3s ease",
                position: isTakeover ? "fixed" : "relative",
                top: isTakeover ? 48 : undefined,
                bottom: isTakeover ? 40 : undefined,
                left: isTakeover ? 0 : undefined,
                right: isTakeover ? 0 : undefined,
                display: "flex",
                flexDirection:
                    isMobilePortrait && isCollapsed ? "row" : "column", // Horizontal when collapsed on mobile portrait
                alignItems:
                    isMobilePortrait && isCollapsed ? "center" : "stretch",
                justifyContent:
                    isMobilePortrait && isCollapsed
                        ? "space-between"
                        : "flex-start",
                zIndex: isTakeover ? 1200 : 2,
                pointerEvents: "auto",
                order: isMobilePortrait || isMobileLandscapeCompact ? 3 : 0, // Third row during mobile takeover
            }}
        >
            {/* Header with collapse button */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom:
                        isMobilePortrait && isCollapsed ? "0" : "20px",
                    minHeight:
                        isMobilePortrait && isCollapsed ? "44px" : "32px",
                    flexDirection:
                        isMobilePortrait && isCollapsed ? "row" : "row",
                }}
            >
                {!isCollapsed && (
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: theme.primary,
                            opacity:
                                theme.name === "GZC Light" ||
                                theme.name === "Arctic" ||
                                theme.name === "Parchment" ||
                                theme.name === "Pearl"
                                    ? 0.9
                                    : 1,
                            margin: 0,
                            letterSpacing: "0.5px",
                        }}
                    >
                        Market Intel
                    </h3>
                )}

                <button
                    aria-label={
                        isMobilePortrait
                            ? isCollapsed
                                ? "Expand panel down"
                                : "Collapse panel up"
                            : isMobileLandscapeCompact
                            ? isCollapsed
                                ? "Expand panel right"
                                : "Collapse panel left"
                            : isCollapsed
                            ? "Expand left panel"
                            : "Collapse left panel"
                    }
                    title={
                        isMobilePortrait
                            ? isCollapsed
                                ? "Expand"
                                : "Collapse"
                            : isMobileLandscapeCompact
                            ? isCollapsed
                                ? "Expand"
                                : "Collapse"
                            : isCollapsed
                            ? "Expand"
                            : "Collapse"
                    }
                    onClick={() => {
                        const next = !isCollapsed;
                        setIsCollapsed(next);
                        userCollapsedRef.current = next;
                        try {
                            localStorage.setItem(
                                "gzc-leftpanel-collapsed",
                                String(next)
                            );
                        } catch {}
                        // Fire event to notify grid layout - both immediate and delayed
                        window.dispatchEvent(new CustomEvent("panel-toggled"));
                        // Also trigger a resize event to force grid recalculation
                        setTimeout(() => {
                            window.dispatchEvent(new Event("resize"));
                        }, 50);
                        setTimeout(() => {
                            window.dispatchEvent(new Event("resize"));
                        }, 350); // After animation completes
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            (e.currentTarget as HTMLButtonElement).click();
                        }
                    }}
                    style={{
                        background: "none",
                        border: "none",
                        color: theme.textSecondary,
                        cursor: "pointer",
                        padding: "6px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                        marginLeft: isCollapsed ? 0 : "auto",
                        position: "relative",
                        zIndex: 3,
                        pointerEvents: "auto",
                        touchAction: "manipulation",
                        width: 36,
                        height: 36,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.surface;
                        e.currentTarget.style.color = theme.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = theme.textSecondary;
                    }}
                >
                    <FeatherIcon
                        name={
                            isMobilePortrait
                                ? isCollapsed
                                    ? "chevron-down"
                                    : "chevron-up"
                                : isMobileLandscapeCompact
                                ? isCollapsed
                                    ? "chevron-right"
                                    : "chevron-left"
                                : isCollapsed
                                ? "chevron-right"
                                : "chevron-left"
                        }
                        size={16}
                    />
                </button>
            </div>

            {/* AI Agent Panel with Tabs */}
            {!isCollapsed && (
                <>
                    {/* Tab Navigation */}
                    <AIAgentTabs />

                    {/* AI Agent Content - responsive reflow for compact landscape */}
                    <div
                        style={{
                            flex: 1,
                            display: isMobileLandscapeCompact ? "flex" : "grid",
                            gridTemplateColumns: isMobileLandscapeCompact
                                ? "none"
                                : "1fr",
                            flexDirection: isMobileLandscapeCompact
                                ? "row"
                                : "column",
                            gap: 12,
                            overflow: isMobileLandscapeCompact
                                ? "hidden"
                                : isMobilePortrait
                                ? "auto"
                                : "auto",
                            minHeight: 0, // Allow flex child to shrink
                        }}
                    >
                        {isMobileLandscapeCompact ? (
                            // Mobile landscape: horizontal scrollable sections
                            <div
                                className="mobile-landscape-scroll"
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: 12,
                                    overflowX: "auto",
                                    overflowY: "hidden",
                                    flex: 1,
                                    paddingBottom: "8px",
                                }}
                            >
                                <div
                                    className="mobile-landscape-section"
                                    style={{
                                        minWidth: "200px",
                                        flexShrink: 0,
                                        maxHeight: "100%",
                                        overflowY: "auto",
                                        paddingRight: "4px",
                                    }}
                                >
                                    <AIAgentContent
                                        noScroll={false}
                                        showTitle={true}
                                        title="AI Agents"
                                    />
                                </div>
                                <div
                                    className="mobile-landscape-section"
                                    style={{
                                        minWidth: "200px",
                                        flexShrink: 0,
                                        maxHeight: "100%",
                                        overflowY: "auto",
                                        paddingRight: "4px",
                                    }}
                                >
                                    <AIAgentContent
                                        noScroll={false}
                                        showTitle={true}
                                        title="Alerts"
                                    />
                                </div>
                                <div
                                    className="mobile-landscape-section"
                                    style={{
                                        minWidth: "200px",
                                        flexShrink: 0,
                                        maxHeight: "100%",
                                        overflowY: "auto",
                                        paddingRight: "4px",
                                    }}
                                >
                                    <AIAgentContent
                                        noScroll={false}
                                        showTitle={true}
                                        title="Azure Jobs"
                                    />
                                </div>
                            </div>
                        ) : (
                            // Desktop/portrait: vertical stacked sections
                            <div
                                style={{
                                    minWidth: 0,
                                    flex: 1,
                                    overflowY: isMobilePortrait
                                        ? "auto"
                                        : "auto",
                                    minHeight: 0,
                                }}
                            >
                                <AIAgentContent
                                    noScroll={false}
                                    showTitle={true}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Collapsed state - just icons */}
            {isCollapsed && (
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: isMobilePortrait ? "row" : "column",
                        alignItems: "center",
                        justifyContent: isMobilePortrait
                            ? "space-between"
                            : "center",
                        gap: isMobilePortrait ? "8px" : "12px",
                        padding: isMobilePortrait ? "0 8px" : "0",
                    }}
                >
                    <div
                        style={{
                            padding: "8px",
                            borderRadius: "6px",
                            backgroundColor: theme.surface,
                        }}
                        title="AI Agents"
                    >
                        <FeatherIcon
                            name="cpu"
                            size={16}
                            color={theme.primary}
                        />
                    </div>
                    <div
                        style={{ padding: "8px", borderRadius: "6px" }}
                        title="Notifications"
                    >
                        <FeatherIcon
                            name="bell"
                            size={16}
                            color={theme.textSecondary}
                        />
                    </div>
                    <div
                        style={{ padding: "8px", borderRadius: "6px" }}
                        title="Reports"
                    >
                        <FeatherIcon
                            name="file-text"
                            size={16}
                            color={theme.textSecondary}
                        />
                    </div>
                    <div
                        style={{ padding: "8px", borderRadius: "6px" }}
                        title="Azure Jobs"
                    >
                        <FeatherIcon
                            name="cloud"
                            size={16}
                            color={theme.textSecondary}
                        />
                    </div>
                </div>
            )}

            {/* Removed status footer - moved to main app status bar */}
        </div>
    );
};

// AI Agent Tabs Component
const AIAgentTabs = () => {
    const [activeTab, setActiveTab] = useState("agents");
    const { currentTheme: theme } = useTheme();

    const tabs = [
        { id: "agents", label: "AI Agents", icon: "cpu" },
        { id: "notifications", label: "Alerts", icon: "bell" },
        { id: "reports", label: "Reports", icon: "file-text" },
        { id: "azure", label: "Azure Jobs", icon: "cloud" },
    ];

    return (
        <div
            style={{
                display: "flex",
                borderBottom: `1px solid ${theme.borderLight}`,
                marginBottom: "16px",
            }}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "8px 4px",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        borderBottom:
                            activeTab === tab.id
                                ? `2px solid ${theme.primary}`
                                : "2px solid transparent",
                        transition: "all 0.2s ease",
                    }}
                >
                    <FeatherIcon
                        name={tab.icon}
                        size={14}
                        color={
                            activeTab === tab.id
                                ? theme.primary
                                : theme.textSecondary
                        }
                    />
                    <span
                        style={{
                            fontSize: "10px",
                            color:
                                activeTab === tab.id
                                    ? theme.primary
                                    : theme.textSecondary,
                            marginTop: "2px",
                            fontWeight: activeTab === tab.id ? 600 : 400,
                        }}
                    >
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    );
};

// AI Agent Content Component
const AIAgentContent = ({
    noScroll = false,
    showTitle = false,
    title = "AI Agents",
}: {
    noScroll?: boolean;
    showTitle?: boolean;
    title?: string;
}) => {
    const { currentTheme: theme } = useTheme();

    const renderContent = () => {
        switch (title) {
            case "AI Agents":
                return (
                    <>
                        <AIAgentCard
                            name="Market Sentiment Analyzer"
                            status="running"
                            lastUpdate="2 min ago"
                            icon="brain"
                        />
                        <AIAgentCard
                            name="Risk Assessment Bot"
                            status="idle"
                            lastUpdate="15 min ago"
                            icon="shield"
                        />
                        <AIAgentCard
                            name="News Impact Scorer"
                            status="running"
                            lastUpdate="1 min ago"
                            icon="newspaper"
                        />
                    </>
                );
            case "Alerts":
                return (
                    <>
                        <NotificationCard
                            type="info"
                            message="Federal Reserve speech at 2:00 PM EST"
                            time="10 min ago"
                        />
                        <NotificationCard
                            type="warning"
                            message="Unusual volume spike in EUR/USD"
                            time="25 min ago"
                        />
                        <NotificationCard
                            type="success"
                            message="Weekly report generated successfully"
                            time="1 hour ago"
                        />
                    </>
                );
            case "Azure Jobs":
                return (
                    <>
                        <AzureJobCard
                            jobName="Data Pipeline Sync"
                            status="completed"
                            progress={100}
                            eta="Completed"
                        />
                        <AzureJobCard
                            jobName="ML Model Training"
                            status="running"
                            progress={67}
                            eta="8 min remaining"
                        />
                        <AzureJobCard
                            jobName="Report Distribution"
                            status="queued"
                            progress={0}
                            eta="Starting soon"
                        />
                    </>
                );
            default:
                // Default: show all content (desktop/portrait mode)
                return (
                    <>
                        {/* Active AI Agents */}
                        <div style={{ marginBottom: "20px" }}>
                            <h4
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: theme.textSecondary,
                                    marginBottom: "8px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                Active AI Agents
                            </h4>
                            <AIAgentCard
                                name="Market Sentiment Analyzer"
                                status="running"
                                lastUpdate="2 min ago"
                                icon="brain"
                            />
                            <AIAgentCard
                                name="Risk Assessment Bot"
                                status="idle"
                                lastUpdate="15 min ago"
                                icon="shield"
                            />
                            <AIAgentCard
                                name="News Impact Scorer"
                                status="running"
                                lastUpdate="1 min ago"
                                icon="newspaper"
                            />
                        </div>

                        {/* Recent Notifications */}
                        <div style={{ marginBottom: "20px" }}>
                            <h4
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: theme.textSecondary,
                                    marginBottom: "8px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                Recent Alerts
                            </h4>
                            <NotificationCard
                                type="info"
                                message="Federal Reserve speech at 2:00 PM EST"
                                time="10 min ago"
                            />
                            <NotificationCard
                                type="warning"
                                message="Unusual volume spike in EUR/USD"
                                time="25 min ago"
                            />
                            <NotificationCard
                                type="success"
                                message="Weekly report generated successfully"
                                time="1 hour ago"
                            />
                        </div>

                        {/* Azure Job Queue */}
                        <div>
                            <h4
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: theme.textSecondary,
                                    marginBottom: "8px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                Azure Job Queue
                            </h4>
                            <AzureJobCard
                                jobName="Data Pipeline Sync"
                                status="completed"
                                progress={100}
                                eta="Completed"
                            />
                            <AzureJobCard
                                jobName="ML Model Training"
                                status="running"
                                progress={67}
                                eta="8 min remaining"
                            />
                            <AzureJobCard
                                jobName="Report Distribution"
                                status="queued"
                                progress={0}
                                eta="Starting soon"
                            />
                        </div>
                    </>
                );
        }
    };

    return (
        <div style={{ flex: 1, overflowY: noScroll ? "hidden" : "auto" }}>
            {showTitle && (
                <h4
                    style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: theme.textSecondary,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    {title}
                </h4>
            )}
            {renderContent()}
        </div>
    );
};

// AI Agent Card Component
const AIAgentCard = ({
    name,
    status,
    lastUpdate,
    icon,
}: {
    name: string;
    status: "running" | "idle" | "error";
    lastUpdate: string;
    icon: string;
}) => {
    const { currentTheme: theme } = useTheme();

    const statusColor =
        status === "running"
            ? theme.success
            : status === "idle"
            ? theme.textSecondary
            : theme.danger;

    return (
        <div
            style={{
                padding: "8px",
                marginBottom: "6px",
                backgroundColor: theme.surface,
                borderRadius: "4px",
                border: `1px solid ${theme.borderLight}`,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                }}
            >
                <FeatherIcon
                    name={icon}
                    size={12}
                    color={theme.primary}
                    style={{
                        opacity:
                            theme.name.includes("Light") ||
                            theme.name === "Arctic" ||
                            theme.name === "Parchment" ||
                            theme.name === "Pearl"
                                ? 0.7
                                : 1,
                    }}
                />
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        color: theme.text,
                        marginLeft: "6px",
                        flex: 1,
                    }}
                >
                    {name}
                </span>
                <div
                    style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: statusColor,
                        opacity:
                            theme.name.includes("Light") ||
                            theme.name === "Arctic" ||
                            theme.name === "Parchment" ||
                            theme.name === "Pearl"
                                ? 0.8
                                : 1,
                    }}
                />
            </div>
            <div
                style={{
                    fontSize: "9px",
                    color: theme.textTertiary,
                }}
            >
                {lastUpdate}
            </div>
        </div>
    );
};

// Notification Card Component
const NotificationCard = ({
    type,
    message,
    time,
}: {
    type: "info" | "warning" | "success" | "error";
    message: string;
    time: string;
}) => {
    const { currentTheme: theme } = useTheme();

    const typeColors = {
        info: theme.primary,
        warning: theme.warning,
        success: theme.success,
        error: theme.danger,
    };

    const typeIcons = {
        info: "info",
        warning: "alert-triangle",
        success: "check-circle",
        error: "x-circle",
    };

    return (
        <div
            style={{
                padding: "8px",
                marginBottom: "6px",
                backgroundColor: theme.background,
                borderRadius: "4px",
                borderLeft: `3px solid ${typeColors[type]}`,
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start" }}>
                <FeatherIcon
                    name={typeIcons[type]}
                    size={10}
                    color={typeColors[type]}
                />
                <div style={{ marginLeft: "6px", flex: 1 }}>
                    <div
                        style={{
                            fontSize: "10px",
                            color: theme.text,
                            lineHeight: "12px",
                            marginBottom: "2px",
                        }}
                    >
                        {message}
                    </div>
                    <div
                        style={{
                            fontSize: "9px",
                            color: theme.textTertiary,
                        }}
                    >
                        {time}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Azure Job Card Component
const AzureJobCard = ({
    jobName,
    status,
    progress,
    eta,
}: {
    jobName: string;
    status: "running" | "completed" | "queued" | "error";
    progress: number;
    eta: string;
}) => {
    const { currentTheme: theme } = useTheme();

    const statusColors = {
        running: theme.primary,
        completed: theme.success,
        queued: theme.textSecondary,
        error: theme.danger,
    };

    return (
        <div
            style={{
                padding: "8px",
                marginBottom: "6px",
                backgroundColor: theme.surface,
                borderRadius: "4px",
                border: `1px solid ${theme.borderLight}`,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                }}
            >
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        color: theme.text,
                    }}
                >
                    {jobName}
                </span>
                <span
                    style={{
                        fontSize: "9px",
                        color: statusColors[status],
                        textTransform: "uppercase",
                        fontWeight: 600,
                    }}
                >
                    {status}
                </span>
            </div>

            {/* Progress Bar */}
            <div
                style={{
                    width: "100%",
                    height: "2px",
                    backgroundColor: theme.borderLight,
                    borderRadius: "1px",
                    marginBottom: "4px",
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: statusColors[status],
                        borderRadius: "1px",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>

            <div
                style={{
                    fontSize: "9px",
                    color: theme.textTertiary,
                }}
            >
                {eta}
            </div>
        </div>
    );
};
