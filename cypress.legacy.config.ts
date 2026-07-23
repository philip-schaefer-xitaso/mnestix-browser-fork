import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';
import cypressSplit from 'cypress-split';

dotenv.config();

// Frozen snapshot of the pre-overhaul E2E suite, kept only to compare against the
// rewritten suite (cypress.config.ts) on the same CI stack for a transition period.
// Do not add new specs or fix flakiness here - migrate the scenario to
// cypress/e2e instead and remove it from cypress/legacy/e2e.
// Settings intentionally match the values this suite ran with before the overhaul.
export default defineConfig({
    defaultCommandTimeout: 150000, // 150
    pageLoadTimeout: 600000, // 600
    requestTimeout: 150000, // 150
    responseTimeout: 200000, // 200
    video: true,
    videoCompression: true,
    retries: 2,
    reporter: 'junit',
    reporterOptions: {
        mochaFile: 'cypress/results/legacy-results.xml',
        toConsole: false,
    },
    e2e: {
        baseUrl: 'http://localhost:3000/',
        excludeSpecPattern: '**/ignoredTestFiles/*.js',
        specPattern: 'cypress/legacy/e2e/**/*.spec.{js,jsx,ts,tsx}',
        supportFile: 'cypress/legacy/support/e2e.ts',
        fixturesFolder: 'cypress/legacy/fixtures',
        experimentalRunAllSpecs: true,
        setupNodeEvents(on, config) {
            cypressSplit(on, config);
            return config;
        },
    },
    env: {
        AAS_REPO_API_URL: 'http://localhost:5065/repo',
        SUBMODEL_REPO_API_URL: 'http://localhost:5065/repo',
        MNESTIX_AAS_GENERATOR_API_URL: 'http://localhost:5065',
        AAS_DISCOVERY_API_URL: 'http://localhost:5065/discovery',
        MNESTIX_API_KEY: 'verySecureApiKey',
        TEST_ADMIN_USER_LOGIN: 'test-admin',
        TEST_ADMIN_USER_PASSWORD: 'admin',
        TEST_USER_LOGIN: 'test',
        TEST_USER_PASSWORD: 'test',
        KEYCLOAK_ISSUER: 'http://keycloak:8080',
    },
});
