import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface PortfolioHeaderProps {
    title: string;
    dateText: string; // already formatted yyyy-mm-dd
}

// Lightweight fixed header used by Portfolio. Always visible; table scrolls underneath.
const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({ title, dateText }) => {
    const { currentTheme } = useTheme();
    return (
        <div
            className="gzc-portfolio-header"
            style={{
                position: "sticky",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 8px",
                borderBottom: `1px solid ${currentTheme.border}`,
                background: currentTheme.surface,
            }}

        >
            <span
                style={{
                    color: currentTheme.success,
                    fontSize: 12,
                    fontWeight: 600,
                }}
                title="Date"
            >
                {dateText}
            </span>
            <span
                style={{
                    color: currentTheme.text,
                    fontSize: 12,
                    fontWeight: 600,
                }}
            >
                {title}
            </span>
        </div>
    );
};

export default PortfolioHeader;


