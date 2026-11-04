import { createContext, useState, useContext, useCallback, useMemo, useRef } from "react";
import AlertStack from "../components/AlertStack";

// This context replaces the browser's built-in alert() everywhere in the app with alerts in the app's own style (see AlertStack for how they look).
// It covers both kinds of feedback: problems ("error"/"warning", something failed or hit a limit) and updates ("success", something was saved or changed). They're one system on purpose, since they look and behave the same way and only the type (and its icon color) differs.
// Any component can call the useAlert() hook to get showAlert, then call showAlert("error", "Couldn't send your message.") (or "success", "warning", "info").
// Alerts stack at the top of the screen and dismiss themselves after a few seconds, or right away with their X button.
// Same setup as UserAuthContext: App.tsx wraps the whole app in AlertProvider, so every page and component has access to it.

// The four kinds of alerts. Warning is for problems that don't stop anything (a slow upload, for instance), info is for neutral notices.
export type AlertType = 'success' | 'error' | 'warning' | 'info';

// This will represent each alert currently on screen.
export interface AlertItem {
    id: number;
    type: AlertType;
    message: string;
    leaving: boolean; // Set right before the alert is removed, so it can play its short exit animation first.
}

interface AlertProviderProps {
    children: React.ReactNode;
}

interface AlertContextData {
    showAlert: (type: AlertType, message: string) => void;
}

// The minimum time each kind of alert stays up before dismissing itself. Errors stay longest since they usually need reading.
const ALERT_DURATION_MS: Record<AlertType, number> = {
    success: 3500,
    info: 3500,
    warning: 5000,
    error: 6000,
};

// Longer messages stay up longer (about 60ms per character, roughly reading speed), so a two-sentence alert doesn't vanish halfway through reading it.
const READING_MS_PER_CHARACTER = 60;

// At most this many alerts on screen at once. Anything older gets dropped, so a burst of errors can't cover the page.
const MAX_ALERTS = 3;

// Matches the exit animation in AlertStack.css.
const EXIT_ANIMATION_MS = 150;

// Initializing AlertContext with undefined as it will be populated by the provider below.
const AlertContext = createContext<AlertContextData | undefined>(undefined);

export const AlertProvider = ({ children }: AlertProviderProps) => {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    // Each alert gets its own ID so it can be dismissed individually. A ref (rather than state) since changing it doesn't need a re-render.
    const nextId = useRef(0);

    // Plays the alert's exit animation, then removes it once the animation is done.
    const dismissAlert = useCallback((id: number) => {
        setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, leaving: true } : alert)));
        setTimeout(() => setAlerts((prev) => prev.filter((alert) => alert.id !== id)), EXIT_ANIMATION_MS);
    }, []);

    const showAlert = useCallback((type: AlertType, message: string) => {
        const id = nextId.current++;

        // If the exact same alert is already showing (clicking Sign in twice with the wrong password, for instance), the old copy is replaced instead of stacking a duplicate.
        setAlerts((prev) => [
            ...prev.filter((alert) => !(alert.type === type && alert.message === message)),
            { id, type, message, leaving: false },
        ].slice(-MAX_ALERTS));

        setTimeout(() => dismissAlert(id), Math.max(ALERT_DURATION_MS[type], message.length * READING_MS_PER_CHARACTER));
    }, [dismissAlert]);

    // useMemo keeps this object the same between renders, so components that list showAlert in a useEffect dependency array don't re-run every time an alert appears or disappears.
    const value = useMemo(() => ({ showAlert }), [showAlert]);

    return (
        <AlertContext.Provider value={value}>
            {children}
            <AlertStack alerts={alerts} onDismiss={dismissAlert} />
        </AlertContext.Provider>
    );
};

// Custom hook to easily access showAlert, same idea as useUserAuth. Throws if it's used outside AlertProvider.
export const useAlert = (): AlertContextData => {
    const context = useContext(AlertContext);
    if (!context) throw new Error("useAlert must be used within an AlertProvider");
    return context;
};
