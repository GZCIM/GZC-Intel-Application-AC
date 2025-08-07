export const isShellContext = (): boolean => {
    const isBrowser = typeof window !== "undefined";
    const shellFlag = isBrowser && (window as any).IS_SHELL_CONTEXT === true;
    console.debug(
        "🔍 [isShellContext] IS_SHELL_CONTEXT global flag:",
        shellFlag
    );
    return shellFlag;
};
