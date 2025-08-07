// gzc-ui/src/context/AuthContext.tsx
import { createContext, useContext } from "react";

export type AuthContextType = {
    getToken: () => Promise<string>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within AuthProvider");
    }
    return context;
};
