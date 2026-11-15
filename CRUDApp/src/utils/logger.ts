/* 
This file will contain two types of logging helpers: 
- Debug logs which are only printed during development
- Errors which always go through the function logError, which is the one place to plug in error reporting later.
*/

// This env var is already set by Vite as true when "npm run dev" is invoked and false when "npm run build" is invoked.
const isDev = import.meta.env.DEV;

// This function is for dev-only logs, useful when implementing new features, etc. 
export function logDebug(...args: unknown[]): void { // ...arg: unknown[] essentially means "any number of args of any type" and unknown is specifically used since it's the safe version of any.
    if (isDev) console.log(...args);
}

// This function handles real failures (e.g. a write that was rejected, a fetch that failed). These will always be printed.
// Context is for small, non-sensitive data that might help with debugging (e.g. an ID). Sensitive data like whole user objects or tokens should never be passed to this function.
export function logError(message: string, error: unknown, context?: Record<string, unknown>): void {
    console.error(message, error, context ?? '');
}

// An error reporting service should be added here later.