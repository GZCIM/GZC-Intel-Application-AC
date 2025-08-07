// DateContext.tsx
import React, { createContext, useContext, useState } from "react";

type DateContextType = {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    return (
        <DateContext.Provider value={{ currentDate, setCurrentDate }}>
            {children}
        </DateContext.Provider>
    );
};

export const useDateContext = () => {
    const context = useContext(DateContext);
    if (!context)
        throw new Error("useDateContext must be used within a DateProvider");
    return context;
};
