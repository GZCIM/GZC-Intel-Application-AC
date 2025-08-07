import { useLocation } from "react-router-dom";

const Sidebar = () => {
    const location = useLocation();

    const pageTitles: Record<string, string> = {
        "/dashboard": "Dashboard Overview",
        "/trading": "Trading Overview",
        "/portfolio": "Portfolio Overview",
        "/research": "Research Insights",
        "/analytics": "Analytics Summary",
    };

    const sidebarContent: Record<
        string,
        (string | { section: string; items: string[] })[]
    > = {
        "/dashboard": ["Overview", "Recent Trades", "Market Data"],
        "/trading": ["Trade Entry", "Order History", "Execution Reports"],
        "/portfolio": [
            {
                section: "PORTFOLIOS",
                items: [
                    "All Portfolios",
                    "Alpha Strategy",
                    "Beta Strategy",
                    "Gamma Strategy",
                ],
            },
            { section: "TAGS", items: ["FX", "Equities", "Fixed Income"] },
        ],
        "/research": ["Market Insights", "Reports", "Forecasts"],
        "/analytics": ["Performance", "Risk Analysis", "Allocations"],
    };

    const title = pageTitles[location.pathname] || "Overview";
    const content = sidebarContent[location.pathname] || [];

    return (
        <aside className="bg-gzc-white dark:bg-gzc-black border-r border-gzc-light-grey dark:border-gzc-dark-grey p-4 w-60">
            <h2 className="text-xl font-bold text-gzc-mid-black dark:text-gzc-light-grey mb-4">{title}</h2>
            <ul className="space-y-2">
                {content.map((entry, index) => {
                    if (typeof entry === "string") {
                        return (
                            <li
                                key={index}
                                className="text-gzc-mid-black dark:text-gzc-light-grey hover:text-gzc-flash-green cursor-pointer"
                            >
                                {entry}
                            </li>
                        );
                    } else {
                        return (
                            <li key={index}>
                                <div className="text-xs font-semibold text-gzc-dark-grey mt-4 mb-2 uppercase">
                                    {entry.section}
                                </div>
                                <ul className="space-y-1">
                                    {entry.items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="text-gzc-mid-black dark:text-gzc-light-grey hover:text-gzc-flash-green cursor-pointer font-medium"
                                        >
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    }
                })}
            </ul>
        </aside>
    );
};

export default Sidebar;