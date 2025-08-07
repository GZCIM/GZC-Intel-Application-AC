// src/components/auth/MsalGuard.tsx
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { ReactNode } from "react";

type Props = {
    children: ReactNode;
    fallback?: ReactNode;
};

export const MsalGuard = ({ children, fallback = null }: Props) => {
    const { inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    if (inProgress !== "none") {
        return fallback || <div>Loading authentication...</div>;
    }

    return <>{children}</>;
};
