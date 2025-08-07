import React from "react";

const Portfolio = () => {
    return (
        <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white p-4">
            <h1 className="text-2xl font-bold mb-4">Portfolio Module</h1>
            <p>Portfolio module is loading successfully.</p>
            <p>This confirms the lazy loading and routing work.</p>
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <h2 className="text-lg font-semibold">Alex's Portfolio Module</h2>
                <p>This would contain:</p>
                <ul className="list-disc list-inside mt-2">
                    <li>Portfolio Metrics</li>
                    <li>Portfolio Filters</li>
                    <li>Portfolio Table</li>
                    <li>Blotter Table</li>
                </ul>
            </div>
        </div>
    );
};

export default Portfolio;