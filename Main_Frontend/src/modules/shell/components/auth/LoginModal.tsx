import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import microsoftLogo from "@/assets/microsoft-icon.svg"; // TODO: Fix asset path
import { useAuth } from "../../../../hooks/useAuth";

interface LoginModalProps {
    isOpen: boolean;
    onLogin: () => void;
}

const LoginModal = ({ isOpen, onLogin }: LoginModalProps) => {
    const { login } = useAuth();

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onLogin();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onLogin]);

    const handleMicrosoftLogin = async (event?: React.MouseEvent<HTMLButtonElement>) => {
        console.log("🔐 LoginModal: Microsoft login button clicked");
        console.log("🔐 LoginModal: Event target:", event?.target);
        console.log("🔐 LoginModal: MSAL instance available:", !!(window as any).msalInstance);
        
        try {
            // Check if MSAL is properly initialized
            if (!(window as any).msalInstance) {
                console.error("🔐 LoginModal: MSAL instance not found on window");
                alert("Authentication system not ready. Please refresh the page and try again.");
                return;
            }

            console.log("🔐 LoginModal: Calling login() function...");
            
            // Prevent multiple simultaneous login attempts
            const button = event?.target as HTMLButtonElement;
            if (button) {
                button.disabled = true;
                button.innerHTML = "🔄 Signing in...";
            }
            
            await login();
            console.log("🔐 LoginModal: Login successful, calling onLogin()");
            onLogin();
        } catch (error) {
            console.error("🔐 LoginModal: Login failed:", error);
            
            // Re-enable button on error
            const button = event?.target as HTMLButtonElement;
            if (button) {
                button.disabled = false;
                button.innerHTML = '<span>🔐</span> Sign in with Microsoft Authenticator';
            }
            
            // Show user-friendly error
            if (error instanceof Error) {
                if (error.message.includes('interaction_in_progress')) {
                    alert("Authentication in progress. Please complete the login in the popup/redirect window.");
                } else if (error.message.includes('popup_window_error')) {
                    alert("Popup blocked. Please allow popups for this site and try again.");
                } else {
                    alert(`Login failed: ${error.message}`);
                }
            } else {
                alert("Login failed. Please try again.");
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-gzc-off-white dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#020617] z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                    >
                        <div className="relative w-full max-w-sm p-8 rounded-xl shadow-xl bg-gzc-white dark:bg-gzc-mid-black border border-gzc-light-grey dark:border-gzc-dark-grey text-center text-gzc-mid-black dark:text-gzc-light-grey">
                            <div className="text-3xl font-semibold mb-1">
                                GZC{" "}
                                <span className="text-sm font-normal text-gzc-dark-grey dark:text-gzc-light-grey">
                                    | Investment Management
                                </span>
                            </div>

                            <button
                                onClick={handleMicrosoftLogin}
                                className="mt-6 flex items-center justify-center gap-3 w-full bg-gzc-light-grey dark:bg-gzc-black hover:bg-gzc-off-white dark:hover:bg-gzc-light-black border border-gzc-light-black dark:border-gzc-dark-grey py-3 px-6 rounded-md text-gzc-mid-black dark:text-gzc-light-grey text-sm font-medium mb-6 transition"
                            >
                                {/* <img src={microsoftLogo} alt="Microsoft" className="w-5 h-5" /> */}
                                <span>🔐</span>
                                Sign in with Microsoft Authenticator
                            </button>

                            <p className="text-sm text-gzc-dark-grey dark:text-gzc-light-grey">
                                New to GZC?{" "}
                                <span className="text-gzc-flash-green cursor-pointer hover:underline">
                                    Create an account
                                </span>
                            </p>

                            <div className="absolute top-2 right-3">
                                <button
                                    onClick={onLogin}
                                    className="text-gzc-dark-grey dark:text-gzc-light-grey hover:text-gzc-mid-black dark:hover:text-white text-xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LoginModal;
