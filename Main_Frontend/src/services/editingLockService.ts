export class EditingLockService {
    private readonly storageKey = "gzc-edit-mode"; // "locked" | "unlocked"
    private readonly sessionKey = "gzc-edit-session-id";
    private readonly defaultMode: "locked" | "unlocked" = "locked";

    isUnlocked(): boolean {
        const mode = localStorage.getItem(this.storageKey) as
            | "locked"
            | "unlocked"
            | null;
        return mode ? mode === "unlocked" : this.defaultMode === "unlocked";
    }

    lock(): void {
        localStorage.setItem(this.storageKey, "locked");
    }

    unlock(): string {
        localStorage.setItem(this.storageKey, "unlocked");
        const id = this.ensureSessionId();
        return id;
    }

    toggle(): boolean {
        if (this.isUnlocked()) {
            this.lock();
            return false;
        }
        this.unlock();
        return true;
    }

    getSessionId(): string {
        return this.ensureSessionId();
    }

    getLockHeaders(): Record<string, string> {
        return this.isUnlocked()
            ? { "X-Editing-Session": this.getSessionId() }
            : {};
    }

    private ensureSessionId(): string {
        let id = localStorage.getItem(this.sessionKey);
        if (!id) {
            id = (
                crypto && "randomUUID" in crypto
                    ? (crypto as any).randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
            ) as string;
            localStorage.setItem(this.sessionKey, id);
        }
        return id;
    }
}

export const editingLockService = new EditingLockService();
