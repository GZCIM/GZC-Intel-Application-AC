import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";

interface SchemaSelectorProps {
    isMobile?: boolean;
    onSchemaChange?: (schemaId: string) => void;
}

export const SchemaSelector: React.FC<SchemaSelectorProps> = ({
    isMobile = false,
    onSchemaChange,
}) => {
    const { currentTheme: theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState<string>("gzc-dark");

    // Schema options matching theme names from bigscreen
    const schemaOptions = [
        { value: "gzc-dark", label: "GZC Dark" },
        { value: "analytics-dark", label: "Analytics Dark" },
        { value: "terminal-green", label: "Terminal Green" },
        { value: "trading-operations", label: "Trading Operations" },
        { value: "midnight-trading", label: "Midnight Trading" },
        { value: "quantum-analytics", label: "Quantum Analytics" },
        { value: "professional", label: "Professional" },
        { value: "gzc-light", label: "GZC Light" },
        { value: "arctic", label: "Arctic" },
        { value: "parchment", label: "Parchment" },
        { value: "pearl", label: "Pearl" },
    ];

    // Load saved schema from localStorage
    useEffect(() => {
        const savedSchema = localStorage.getItem("gzc-selected-schema");
        if (savedSchema) {
            setSelectedSchema(savedSchema);
        }
    }, []);

    const handleSchemaSelect = (schemaId: string) => {
        setSelectedSchema(schemaId);
        localStorage.setItem("gzc-selected-schema", schemaId);
        setIsOpen(false);

        if (onSchemaChange) {
            onSchemaChange(schemaId);
        }
    };

    const selectedOption = schemaOptions.find(
        (s) => s.value === selectedSchema
    );

    // Don't render on desktop unless explicitly requested
    if (!isMobile && typeof window !== "undefined" && window.innerWidth > 768) {
        return null;
    }

    return (
        <div style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: theme.text,
                    transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${theme.primary}10`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                <span style={{ fontSize: "16px" }}>📊</span>
                <span style={{ flex: 1 }}>
                    {selectedOption?.label || "Schema"}
                </span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                    }}
                >
                    <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "4px",
                            minWidth: "180px",
                            backgroundColor: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: "8px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                            padding: "4px",
                            zIndex: 1000,
                        }}
                    >
                        {schemaOptions.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSchemaSelect(option.value)}
                                style={{
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    color:
                                        selectedOption?.value === option.value
                                            ? theme.primary
                                            : theme.text,
                                    background:
                                        selectedOption?.value === option.value
                                            ? theme.name === "Institutional"
                                                ? "rgba(122, 158, 101, 0.08)"
                                                : "rgba(149, 189, 120, 0.08)"
                                            : "transparent",
                                    transition: "all 0.15s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                                onMouseEnter={(e) => {
                                    if (
                                        selectedOption?.value !== option.value
                                    ) {
                                        e.currentTarget.style.background =
                                            theme.name === "Institutional"
                                                ? "rgba(0, 0, 0, 0.03)"
                                                : "rgba(255, 255, 255, 0.03)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (
                                        selectedOption?.value !== option.value
                                    ) {
                                        e.currentTarget.style.background =
                                            "transparent";
                                    }
                                }}
                            >
                                <span>{option.label}</span>
                                {selectedOption?.value === option.value && (
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M20 6L9 17l-5-5"
                                            stroke={theme.primary}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
