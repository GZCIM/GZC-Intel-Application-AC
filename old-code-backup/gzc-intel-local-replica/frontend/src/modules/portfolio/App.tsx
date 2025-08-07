//gzc-portfolio-app\src\App.tsx
import React from "react";
import Portfolio from "./Portfolio"; // This should point to your entry Portfolio component
import { QuoteProvider } from "../ui-library";
import { DateProvider, DateSelector, useDateContext } from "../ui-library"; // Ensure this path is correct
import { ThemeProvider, useTheme } from "../ui-library"; // uses fallback if shell not present
import { AuthContext } from "../ui-library"; // Ensure this path is correct
console.log("Stand alone AuthContext identity:", AuthContext);
const mockGetToken = async () => {
    console.warn("[Portfolio] Using mock token.");
    return import.meta.env.VITE_MOCK_AUTH_TOKEN || "mock-token";
};
const PortfolioWithDateSelector = () => {
    const { currentDate, setCurrentDate } = useDateContext();

    return (
        <div className="space-y-6">
            <DateSelector
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
            />
            <Portfolio />
        </div>
    );
};
const App = () => {
    return (
        <AuthContext.Provider value={{ getToken: mockGetToken }}>
            <ThemeProvider>
                <DateProvider>
                    <QuoteProvider>
                        <PortfolioWithDateSelector />
                    </QuoteProvider>
                </DateProvider>
            </ThemeProvider>
        </AuthContext.Provider>
    );
};

export default App;
