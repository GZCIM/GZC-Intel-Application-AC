/// <reference types="react" />
import React from "react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
    theme: "light" | "dark";
    toggleTheme: () => void;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
    return (
        <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:scale-105 transition"
            onClick={toggleTheme}
            title="Toggle theme"
        >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
    );
};
export type { ThemeToggleProps };
export default ThemeToggle;
