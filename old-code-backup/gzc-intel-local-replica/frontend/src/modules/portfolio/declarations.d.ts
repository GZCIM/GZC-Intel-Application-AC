declare module "gzc_main_shell/context/AuthContext" {
    import { AuthContextType } from "@/context/AuthContext";
    import { Context } from "react";

    export const AuthContext: Context<AuthContextType>;
    export const useAuthContext: () => AuthContextType;
}
