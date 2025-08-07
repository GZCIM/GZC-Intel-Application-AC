/// <reference types="react" />
import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export const Card = ({ children, className = "", title }: CardProps) => {
    return (
        <div
            className={`rounded-2xl shadow-md bg-white dark:bg-gzc-mid-black p-4 ${className}`}
        >
            {title && (
                <div className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    {title}
                </div>
            )}
            {children}
        </div>
    );
};

export const CardContent = ({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return <div className={`text-sm ${className}`}>{children}</div>;
};
