//gzc-main-shell\src\components\layout\Header.tsx
import { ThemeToggle, DateSelector } from "../../../ui-library";
import { useTheme, useDateContext } from "../../../ui-library";
import { useMsal } from "@azure/msal-react";
import { useState } from "react";
import { loginRequest } from "../auth/msalConfig";

const Header = () => {
    const { instance, accounts } = useMsal();
    const [menuOpen, setMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { currentDate, setCurrentDate } = useDateContext();
    const handleLogout = async () => {
        await instance.logoutPopup();
        window.location.reload(); // Force re-evaluation of auth state to show login modal
    };

    const handleLogin = async () => {
        await instance.loginPopup(loginRequest);
    };

    const userEmail = accounts[0]?.username || "";

    return (
        <header className="flex items-center justify-between px-6 h-[60px] bg-gzc-white dark:bg-gzc-black border-b border-gzc-light-grey dark:border-gzc-dark-grey">
            <div className="text-lg font-semibold tracking-tight text-gzc-mid-black dark:text-gzc-light-grey">
                GZC Intel
            </div>
            <div className="flex items-center space-x-4 relative">
                <div className="text-sm text-gzc-light-black dark:text-gzc-light-grey">
                    Balance: <span className="font-semibold">$1,250,000</span>
                </div>
                <div className="text-sm text-gzc-light-black dark:text-gzc-light-grey">
                    Equity: <span className="font-semibold">$900,000</span>
                </div>
                <div className="text-sm text-gzc-light-black dark:text-gzc-light-grey">
                    Margin: <span className="font-semibold">$150,000</span>
                </div>
                <DateSelector
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                />
                <ThemeToggle
                    theme={theme as "light" | "dark"}
                    toggleTheme={toggleTheme}
                />

                {/* User Avatar + Menu */}
                <div className="relative">
                    <div
                        className="w-8 h-8 rounded-full bg-gzc-light-grey dark:bg-gzc-dark-grey cursor-pointer flex items-center justify-center text-xs font-semibold text-gzc-mid-black dark:text-gzc-light-grey"
                        title={userEmail || "Click to login"}
                        onClick={() => {
                            if (!userEmail) handleLogin();
                            else setMenuOpen(!menuOpen);
                        }}
                    >
                        {userEmail ? userEmail.charAt(0).toUpperCase() : "?"}
                    </div>

                    {menuOpen && userEmail && (
                        <div className="absolute right-0 mt-2 w-56 bg-gzc-white dark:bg-gzc-mid-black border border-gzc-light-grey dark:border-gzc-dark-grey rounded shadow z-50">
                            <div className="px-4 py-2 text-xs text-gzc-dark-grey dark:text-gzc-light-grey border-b border-gzc-light-grey dark:border-gzc-dark-grey">
                                Signed in as
                                <div className="text-sm font-medium text-gzc-mid-black dark:text-gzc-light-grey">
                                    {userEmail}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-gzc-mid-black dark:text-gzc-light-grey hover:bg-gzc-light-grey dark:hover:bg-gzc-dark-grey"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
