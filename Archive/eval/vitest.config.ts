import { defineConfig } from 'vitest/config';

// Vitest config for the rules tests only. The app itself has no test config, so this lives next to the emulator setup instead of at the project root.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        environment: 'node',
        // Every test file talks to the same emulator and wipes it between tests, so running files in parallel would have them clearing each other's data mid-test.
        fileParallelism: false,
        // Emulator round trips are slower than in-memory tests, so the defaults (5s) are raised a bit.
        testTimeout: 15000,
        hookTimeout: 30000,
    },
});
