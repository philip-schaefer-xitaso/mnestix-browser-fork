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
    // Cypress.env() hydrates every "env" value into the browser and is deprecated
    // (removed in Cypress 16). Secret values (API key, credentials, NextAuth secret)
    // stay in "env" and must only be read via the secure `cy.env()` command; anything
    // safe to expose to the browser (URLs, realm/client ids, grepTags) is bridged into
    // "expose" below and read via the synchronous `Cypress.expose()`.
    allowCypressEnv: false,
    e2e: {
        baseUrl: 'http://localhost:3000/',
        specPattern: 'cypress/e2e/**/*.spec.ts',
        experimentalRunAllSpecs: true,
        setupNodeEvents(on, config) {
            // CI/compose override these non-secret values through CYPRESS_-prefixed
            // env vars, which only ever land in `config.env` (not `config.expose`) -
            // so bridge the public subset across here rather than duplicating the
            // override mechanism. Must run before cypressGrepPlugin(config), which
            // reads config.expose.grepTags for its spec pre-filtering step.
            config.expose = {
                ...config.expose,
                AAS_REPO_API_URL: config.env.AAS_REPO_API_URL,
                SUBMODEL_REPO_API_URL: config.env.SUBMODEL_REPO_API_URL,
                MNESTIX_AAS_GENERATOR_API_URL: config.env.MNESTIX_AAS_GENERATOR_API_URL,
                AAS_DISCOVERY_API_URL: config.env.AAS_DISCOVERY_API_URL,
                KEYCLOAK_ISSUER: config.env.KEYCLOAK_ISSUER,
                KEYCLOAK_REALM: config.env.KEYCLOAK_REALM,
                KEYCLOAK_CLIENT_ID: config.env.KEYCLOAK_CLIENT_ID,
                grepTags: config.env.grepTags,
            };
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
        // Secret - only read via cy.env(), never bridged into `expose` above.
        MNESTIX_API_KEY: 'verySecureApiKey',
        TEST_ADMIN_USER_LOGIN: 'test-admin',
        TEST_ADMIN_USER_PASSWORD: 'admin',
        TEST_USER_LOGIN: 'test',
        TEST_USER_PASSWORD: 'test',
        KEYCLOAK_ISSUER: 'http://localhost:8080',
        KEYCLOAK_REALM: 'Mnestix',
        KEYCLOAK_CLIENT_ID: 'mnestix-browser-client-demo',
        // Secret - signs NextAuth session cookies, only read via cy.env().
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
