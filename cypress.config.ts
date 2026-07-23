import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';
import cypressSplit from 'cypress-split';
import { plugin as cypressGrepPlugin } from '@cypress/grep/plugin';
import { createKeycloakSession } from './cypress/support/tasks';

dotenv.config();

export default defineConfig({
    // Short by design: a missing element or a stuck request should fail fast, not
    // hide for minutes. Individual slow operations (e.g. AAS import) opt into a
    // longer wait explicitly at the call site instead of raising the global default.
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 15000,
    video: true,
    videoCompression: true,
    retries: 0,
    reporter: 'junit',
    reporterOptions: {
        mochaFile: 'cypress/results/results.xml',
        toConsole: false,
    },
    e2e: {
        baseUrl: 'http://localhost:3000/',
        specPattern: 'cypress/e2e/**/*.spec.ts',
        experimentalRunAllSpecs: true,
        setupNodeEvents(on, config) {
            cypressSplit(on, config);
            cypressGrepPlugin(config);
            on('task', {
                createKeycloakSession,
            });
            return config;
        },
    },
    env: {
        // Defaults target a developer's host machine talking to dependencies started
        // via `yarn test:e2e:open`/`yarn test:e2e` (scripts/e2e-local.sh, which starts
        // Keycloak/BaSyx/proxy/generator through docker-compose/compose.keycloak.yml
        // with ports published to localhost). The containerized parity run
        // (docker-compose/compose.test.yml) overrides every one of these through
        // CYPRESS_-prefixed environment variables.
        AAS_REPO_API_URL: 'http://localhost:5065/repo',
        SUBMODEL_REPO_API_URL: 'http://localhost:5065/repo',
        MNESTIX_AAS_GENERATOR_API_URL: 'http://localhost:5065',
        AAS_DISCOVERY_API_URL: 'http://localhost:5065/discovery',
        MNESTIX_API_KEY: 'verySecureApiKey',
        TEST_ADMIN_USER_LOGIN: 'test-admin',
        TEST_ADMIN_USER_PASSWORD: 'admin',
        TEST_USER_LOGIN: 'test',
        TEST_USER_PASSWORD: 'test',
        KEYCLOAK_ISSUER: 'http://localhost:8080',
        KEYCLOAK_REALM: 'Mnestix',
        KEYCLOAK_CLIENT_ID: 'mnestix-browser-client-demo',
        NEXTAUTH_SECRET: 'verySecureNextAuthSecret',
        // Excludes @camera- and @external-tagged specs by default (`--@tag` is
        // @cypress/grep's syntax for an explicit, always-applied NOT filter).
        // @camera drives a real getUserMedia video element and only makes sense with
        // a real webcam via `cypress open --env grepTags=@camera`. @external depends on
        // a third-party host (vws.xitaso.com) and is excluded from the reliable CI run;
        // run it explicitly with `cypress open --env grepTags=@external` when needed.
        grepTags: '--@camera --@external',
    },
});
