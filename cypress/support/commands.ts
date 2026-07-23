import testAAS from '../fixtures/cypress_e2e/cypressTestAas.json';
import testDropdown from '../fixtures/cypress_e2e/Submodels/cyDropdown.json';
import testDropdownSubRef from '../fixtures/cypress_e2e/Submodels/cyDropdown_SubmodelReference.json';
import testBom from '../fixtures/cypress_e2e/Submodels/cyBillOfMaterial.json';
import testBomSubRef from '../fixtures/cypress_e2e/Submodels/cyBillOfMaterial_SubmodelReference.json';
import AASBomComponent from '../fixtures/cypress_e2e/cyTestAas_BoM_Component.json';
import qrAAS from '../fixtures/cypress_e2e/QrScannerMockData/cy_qrScannerAas.json';
import qrSubmodels from '../fixtures/cypress_e2e/QrScannerMockData/cy_qrScannerNameplateSubmodel.json';
import listAasMockData from '../fixtures/cypress_e2e/AasListMockData/cyListAasMockData.json';
import listAasSubmodelMockData from '../fixtures/cypress_e2e/AasListMockData/cy_ListNameplateSubmodel.json';
import thumbnailAasMockData from '../fixtures/cypress_e2e/ThumbnailFileMockData/thumbnailAasMockData.json';
import toBase64 from './base64-conversion';

Cypress.Commands.add('setResolution', (res) => {
    if (Array.isArray(res)) {
        cy.viewport(res[0], res[1]);
    } else {
        cy.viewport(res);
    }
});

Cypress.Commands.add('visitViewer', (aasId) => {
    cy.visit('/viewer/' + toBase64(aasId));
});

Cypress.Commands.add('getByTestId', (dataTestId, option?) => {
    cy.get('[data-testid=' + dataTestId + ']', option);
});

Cypress.Commands.add('findByTestId', { prevSubject: true }, (subject, dataTestId) => {
    return cy.wrap(subject).find('[data-testid=' + dataTestId + ']');
});

Cypress.Commands.add('repoRequest', (requestMethod, urlPath, requestBody) => {
    cy.request({
        method: requestMethod,
        url: `${Cypress.env('AAS_REPO_API_URL')}${urlPath}`,
        headers: {
            'X-API-KEY': Cypress.env('MNESTIX_API_KEY'),
        },
        body: requestBody,
        failOnStatusCode: false,
    });
});

Cypress.Commands.add('registryRequest', (requestMethod, urlPath) => {
    // The integrated BaSyx registry is exposed through the proxy under /registry,
    // next to the /repo path used by repoRequest.
    cy.request({
        method: requestMethod,
        url: `${Cypress.env('AAS_REPO_API_URL').replace(/\/repo$/, '/registry')}${urlPath}`,
        headers: {
            'X-API-KEY': Cypress.env('MNESTIX_API_KEY'),
        },
        failOnStatusCode: false,
    });
});

Cypress.Commands.add('waitForRepoReady', () => {
    // On a freshly started backend the proxy still needs a moment before it can
    // forward requests to the BaSyx repository. Because `repoRequest` uses
    // `failOnStatusCode: false`, seeding POSTs fired during that window are lost
    // silently, leaving specs to run against missing data. Poll the repository
    // until it answers successfully before any data is seeded.
    const maxAttempts = 60;
    function attempt(attemptNumber: number) {
        cy.request({
            method: 'GET',
            url: `${Cypress.env('AAS_REPO_API_URL')}/shells`,
            headers: {
                'X-API-KEY': Cypress.env('MNESTIX_API_KEY'),
            },
            failOnStatusCode: false,
            timeout: 10000,
        }).then((response) => {
            if (response.status === 200) {
                return;
            }
            if (attemptNumber >= maxAttempts) {
                throw new Error(
                    `AAS repository was not ready after ${maxAttempts} attempts (last status: ${response.status}).`,
                );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- deliberate backoff between readiness polls
            cy.wait(1000);
            attempt(attemptNumber + 1);
        });
    }
    attempt(1);
});

Cypress.Commands.add('postSeed', (urlPath, body) => {
    // Seeding POSTs must actually land before the specs run against them. A plain
    // `repoRequest` uses `failOnStatusCode: false`, so a transient cold-start error
    // (proxy/basyx still warming up) is swallowed silently and the data is missing
    // for the whole spec run. Retry on transient failures and throw loudly if the
    // resource still cannot be created, so a real problem fails fast instead of
    // running into minutes of timeouts against missing data.
    const maxAttempts = 30;
    function attempt(attemptNumber: number) {
        cy.request({
            method: 'POST',
            url: `${Cypress.env('AAS_REPO_API_URL')}${urlPath}`,
            headers: {
                'X-API-KEY': Cypress.env('MNESTIX_API_KEY'),
            },
            body,
            failOnStatusCode: false,
            timeout: 10000,
        }).then((response) => {
            // 2xx: created. 409: already exists, which is fine for idempotent seeding.
            if ((response.status >= 200 && response.status < 300) || response.status === 409) {
                return;
            }
            if (attemptNumber >= maxAttempts) {
                throw new Error(
                    `Seeding POST ${urlPath} failed after ${maxAttempts} attempts (last status: ${response.status}).`,
                );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- deliberate backoff between seeding retries
            cy.wait(1000);
            attempt(attemptNumber + 1);
        });
    }
    attempt(1);
});

Cypress.Commands.add('postShell', (aasBody) => {
    // Seeding a shell against basyx-go is surprisingly fragile: POSTing a shell
    // auto-registers an AAS descriptor in the integrated registry, and a leftover
    // descriptor from an earlier run makes the next POST /shells fail with 409 while
    // the shell is never created in the repository. Cleanup is complicated by two
    // basyx-go quirks:
    //   1. Ids are encoded differently per verb - the registry keys descriptors by
    //      PADDED base64 (btoa) while the repository DELETE only matches UNPADDED
    //      base64 (toBase64); the wrong encoding is a silent 404 no-op.
    //   2. The registry and repository are eventually consistent, so a single
    //      delete-then-post can still race and 409.
    // Rather than trusting any single response, clear both stores and then verify the
    // shell is actually readable from the repository, retrying until it converges.
    const paddedId = btoa(aasBody.id);
    const unpaddedId = toBase64(aasBody.id);
    const maxAttempts = 30;
    function attempt(attemptNumber: number) {
        cy.registryRequest('DELETE', '/shell-descriptors/' + paddedId);
        cy.repoRequest('DELETE', '/shells/' + unpaddedId, null);
        cy.repoRequest('POST', '/shells', aasBody);
        cy.repoRequest('GET', '/shells/' + paddedId, null).then((response) => {
            if (response.status === 200) {
                return;
            }
            if (attemptNumber >= maxAttempts) {
                throw new Error(
                    `Seeding shell ${aasBody.id} did not land in the repository after ${maxAttempts} attempts ` +
                        `(last GET status: ${response.status}).`,
                );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- backoff for basyx-go registry/repo eventual consistency
            cy.wait(1000);
            attempt(attemptNumber + 1);
        });
    }
    attempt(1);
});

Cypress.Commands.add('postSubmodel', (submodelBody) => {
    // Submodels have the same integrated-registry orphan + per-verb encoding + eventual
    // consistency problems as shells (see postShell). Clear both stores and verify the
    // submodel is readable from the repository, retrying until it converges.
    const paddedId = btoa(submodelBody.id);
    const unpaddedId = toBase64(submodelBody.id);
    const maxAttempts = 30;
    function attempt(attemptNumber: number) {
        cy.registryRequest('DELETE', '/submodel-descriptors/' + paddedId);
        cy.repoRequest('DELETE', '/submodels/' + unpaddedId, null);
        cy.repoRequest('POST', '/submodels', submodelBody);
        cy.repoRequest('GET', '/submodels/' + paddedId, null).then((response) => {
            if (response.status === 200) {
                return;
            }
            if (attemptNumber >= maxAttempts) {
                throw new Error(
                    `Seeding submodel ${submodelBody.id} did not land in the repository after ${maxAttempts} attempts ` +
                        `(last GET status: ${response.status}).`,
                );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- backoff for basyx-go registry/repo eventual consistency
            cy.wait(1000);
            attempt(attemptNumber + 1);
        });
    }
    attempt(1);
});

Cypress.Commands.add('postQrScannerMockData', () => {
    qrAAS.forEach((aas) => {
        cy.postShell(aas);
    });
    qrSubmodels.forEach((submodel) => {
        cy.postSubmodel(submodel);
    });
});

Cypress.Commands.add('deleteQrScannerMockData', () => {
    qrAAS.forEach((aas) => {
        const encodedAasId = btoa(aas.id);
        cy.repoRequest('DELETE', '/shells/' + encodedAasId, null);
    });
    qrSubmodels.forEach((submodel) => {
        const encodedSubmodelId = btoa(submodel.id);
        cy.repoRequest('DELETE', '/submodels/' + encodedSubmodelId, null);
    });
});

Cypress.Commands.add('postTestAas', () => {
    const encodedAasId = toBase64(testAAS.id);
    cy.postShell(testAAS);
    cy.postSubmodelToAas(encodedAasId, testDropdown, testDropdownSubRef);
    cy.postSubmodelToAas(encodedAasId, testBom, testBomSubRef);
});

Cypress.Commands.add('deleteTestAas', () => {
    const encodedAasId = btoa(testAAS.id);
    cy.repoRequest('DELETE', '/shells/' + encodedAasId, null);
    const endcodedTestDropdown = btoa(testDropdown.id);
    cy.repoRequest('DELETE', '/submodels/' + endcodedTestDropdown, null);
    const encodedTestBom = btoa(testBom.id);
    cy.repoRequest('DELETE', '/submodels/' + encodedTestBom, null);
});

Cypress.Commands.add('postSubmodelToAas', (base64EncodedAasId, submodelBody, submodelRef) => {
    cy.postSubmodel(submodelBody);
    cy.postSeed('/shells/' + base64EncodedAasId + '/submodel-refs', submodelRef);
});

Cypress.Commands.add('deleteTestAasBomComponent', () => {
    const encodedAasBomId = toBase64(AASBomComponent.id);
    cy.repoRequest('DELETE', '/shells/' + encodedAasBomId, null);
});

Cypress.Commands.add('postListAasMockData', () => {
    listAasMockData.forEach((aas) => {
        cy.postShell(aas);
    });
    listAasSubmodelMockData.forEach((submodel) => {
        cy.postSubmodel(submodel);
    });
});

Cypress.Commands.add('deleteListAasMockData', () => {
    listAasMockData.forEach((aas) => {
        const encodedAasId = btoa(aas.id);
        cy.repoRequest('DELETE', '/shells/' + encodedAasId, null);
    });
    listAasSubmodelMockData.forEach((submodel) => {
        const encodedSubmodelId = btoa(submodel.id);
        cy.repoRequest('DELETE', '/submodels/' + encodedSubmodelId, null);
    });
});

Cypress.Commands.add('callScannerCallback', (value: string) => {
    cy.window().then((window) => {
        const func = window.Cypress.scannerCallback;
        expect(func).to.be.a('function');
        func(value).catch();
    });
});

Cypress.Commands.add('isNotificationSent', (msg: string) => {
    cy.get('.MuiAlert-message').should('contain.text', msg);
});

// NotificationOutlet.tsx renders `<Alert variant="filled" severity=.../>`, so MUI
// generates a severity-specific class (MuiAlert-filledError / -filledSuccess / ...).
// Asserting on that class - instead of the generic `.MuiAlert-root` the previous
// suite used - fails fast and correctly on the wrong notification type, e.g. an
// error banner shown where a save was expected to succeed.
Cypress.Commands.add('expectSuccessNotification', (message?: string) => {
    if (message) {
        cy.get('.MuiAlert-filledSuccess', { timeout: 10000 }).should('contain.text', message);
    } else {
        cy.get('.MuiAlert-filledSuccess', { timeout: 10000 }).should('be.visible');
    }
});

Cypress.Commands.add('expectErrorNotification', (message?: string) => {
    if (message) {
        cy.get('.MuiAlert-filledError', { timeout: 10000 }).should('contain.text', message);
    } else {
        cy.get('.MuiAlert-filledError', { timeout: 10000 }).should('be.visible');
    }
});

Cypress.Commands.add('postTestThumbnailAas', () => {
    cy.postShell(thumbnailAasMockData);
});

Cypress.Commands.add('deleteTestThumbnailAas', () => {
    const encodedAasThumbnailMockData = btoa(thumbnailAasMockData.id).replace(/=+$/g, '');
    cy.repoRequest('DELETE', '/shells/' + encodedAasThumbnailMockData, null);
});

Cypress.Commands.add('uploadThumbnailToAas', (aasId: string) => {
    const encodedAasId = btoa(aasId).replace(/=+$/g, '');
    cy.fixture('cypress_e2e/ThumbnailFileMockData/test_thumbnail.png', 'binary')
        .then((binary) => Cypress.Blob.binaryStringToBlob(binary, 'image/png'))
        .then((file: Blob) => {
            const formData = new FormData();
            formData.append('file', file);
            cy.request({
                method: 'PUT',
                url:
                    `${Cypress.env('AAS_REPO_API_URL')}` +
                    '/shells/' +
                    encodedAasId +
                    '/asset-information/thumbnail?fileName=test_thumbnail.png',
                body: formData,
                encoding: 'binary',
                headers: {
                    'X-API-KEY': Cypress.env('MNESTIX_API_KEY'),
                },
            });
        });
});

Cypress.Commands.add('deleteThumbnailFromAas', (aasId: string) => {
    const encodedAasId = btoa(aasId).replace(/=+$/g, '');
    cy.repoRequest('DELETE', '/shells/' + encodedAasId + '/asset-information/thumbnail', null);
});

// --- Authentication -------------------------------------------------------
//
// Two authentication paths are intentionally kept separate:
//
// 1. `loginAs`: programmatic session creation. A Cypress Node task
//    authenticates directly against Keycloak's token endpoint (the demo
//    client is public with direct access grants enabled) and mints a real
//    NextAuth session cookie with the exact algorithm NextAuth itself uses
//    (see cypress/support/tasks.ts). This is what almost every authenticated
//    scenario should use: it is fast, and it sidesteps the cross-site cookie
//    handling that made the real OAuth redirect unreliable inside Cypress's
//    iframe (see /memories/repo/cypress-flakes.md for the root cause).
// 2. `keycloakUiLogin` / `keycloakUiLogout`: drives the real login/logout
//    button and Keycloak's hosted login form through `cy.origin`. Reserved
//    for the login/logout contract spec (authContract.spec.ts), the only
//    place that needs to prove the actual browser flow works end to end.

let relayedStateCookies: Record<string, { value: string }> = {};
let relayedSessionCookieChunks: Record<string, string> = {};

Cypress.Commands.add('setupKeycloakStateCookieRelay', () => {
    relayedStateCookies = {};
    relayedSessionCookieChunks = {};

    cy.intercept('POST', '**/api/auth/signin/keycloak*', (req) => {
        req.continue((res) => {
            captureSetCookies(res.headers['set-cookie'], ['next-auth.state', 'next-auth.pkce.code_verifier']).forEach(
                (cookie) => {
                    relayedStateCookies[cookie.name] = { value: cookie.value };
                },
            );
        });
    }).as('keycloakSignIn');

    cy.intercept('GET', '**/api/auth/callback/keycloak*', (req) => {
        const cookieHeader = Object.entries(relayedStateCookies)
            .map(([name, { value }]) => `${name}=${value}`)
            .join('; ');
        if (cookieHeader) {
            req.headers['cookie'] = req.headers['cookie']
                ? `${req.headers['cookie']}; ${cookieHeader}`
                : cookieHeader;
        }
        req.continue((res) => {
            captureSetCookies(res.headers['set-cookie'], ['next-auth.session-token']).forEach((cookie) => {
                relayedSessionCookieChunks[cookie.name] = cookie.value;
            });
        });
    }).as('keycloakCallback');
});

function captureSetCookies(
    setCookieHeader: string | string[] | undefined,
    namePrefixes: string[],
): { name: string; value: string }[] {
    const headers = !setCookieHeader ? [] : Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    return headers
        .map((header) => {
            const [nameValue] = header.split(';');
            const separatorIndex = nameValue.indexOf('=');
            return { name: nameValue.slice(0, separatorIndex), value: nameValue.slice(separatorIndex + 1) };
        })
        .filter((cookie) => namePrefixes.some((prefix) => cookie.name.startsWith(prefix)));
}

Cypress.Commands.add('keycloakUiLogin', (login: string, password: string) => {
    cy.getByTestId('header-burgermenu').click();
    cy.getByTestId('login-button').click();
    cy.origin(Cypress.env('KEYCLOAK_ISSUER'), { args: { login, password } }, ({ login, password }) => {
        cy.get('#username').invoke('focus').type(login);
        cy.get('#password').invoke('focus').type(password, { log: false });
        cy.get('#kc-login').invoke('focus').click();
    });
    cy.then(() => {
        // Cypress does not persist the Set-Cookie from the cross-site callback
        // redirect, so the relayed chunks captured by setupKeycloakStateCookieRelay
        // must be applied explicitly.
        Object.entries(relayedSessionCookieChunks).forEach(([name, value]) => {
            cy.setCookie(name, value, { httpOnly: true, sameSite: 'lax', path: '/' });
        });
    });
    cy.reload();
    cy.getCookies().should((cookies) => {
        expect(cookies.some((cookie) => cookie.name.startsWith('next-auth.session-token'))).to.equal(true);
    });
});

Cypress.Commands.add('keycloakUiLogout', () => {
    cy.getByTestId('logout-button').click();
});

Cypress.Commands.add('loginAs', (role: 'admin' | 'user') => {
    const login = role === 'admin' ? Cypress.env('TEST_ADMIN_USER_LOGIN') : Cypress.env('TEST_USER_LOGIN');
    const password = role === 'admin' ? Cypress.env('TEST_ADMIN_USER_PASSWORD') : Cypress.env('TEST_USER_PASSWORD');

    cy.session(
        ['keycloak-session', role],
        () => {
            cy.task('createKeycloakSession', {
                username: login,
                password,
                keycloakIssuer: Cypress.env('KEYCLOAK_ISSUER'),
                keycloakRealm: Cypress.env('KEYCLOAK_REALM'),
                keycloakClientId: Cypress.env('KEYCLOAK_CLIENT_ID'),
                nextAuthSecret: Cypress.env('NEXTAUTH_SECRET'),
            }).then((cookies) => {
                (cookies as { name: string; value: string }[]).forEach(({ name, value }) => {
                    cy.setCookie(name, value, { httpOnly: true, sameSite: 'lax', path: '/' });
                });
            });
        },
        {
            validate() {
                cy.getCookies().should((cookies) => {
                    expect(
                        cookies.some((cookie) => cookie.name.startsWith('next-auth.session-token')),
                    ).to.equal(true);
                });
            },
        },
    );
    cy.visit('/');
});
