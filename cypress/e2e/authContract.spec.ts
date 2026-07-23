// The one spec that intentionally drives the real login/logout button and Keycloak's
// hosted login form (via cy.origin), instead of the programmatic `cy.loginAs()` used
// everywhere else. This is what actually proves the browser-facing auth contract
// (button -> Keycloak redirect -> callback -> session cookie -> role-based UI) works
// end to end; every other authenticated spec trusts that contract and skips straight
// to a minted session for speed.

// After signOut()'s full-page reload to '/en', the client briefly renders the
// header in a transient state where the drawer's content reflects the
// not-yet-resolved (still-authenticated-looking) session. Opening the drawer
// while that's true "freezes" it showing the stale admin content instead of
// reactively updating once the session resolves to unauthenticated. Toggling
// the drawer closed and reopening forces a fresh render against the latest
// session state, so retry by closing+reopening until login-button shows up.
function clickBurgermenuUntilOpen(attempt = 0) {
    cy.getByTestId('header-burgermenu').click();
    cy.get('body').then(($body) => {
        const hasLoginButton = $body.find('[data-testid="login-button"]').length > 0;
        if (!hasLoginButton && attempt < 20) {
            cy.getByTestId('header-burgermenu').click(); // close
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- deliberate backoff between retry attempts
            cy.wait(300);
            clickBurgermenuUntilOpen(attempt + 1);
        }
    });
}

describe('Keycloak login/logout and role-based access', { tags: '@auth' }, () => {
    let adminTestUser: { login: string; password: string };
    let testUser: { login: string; password: string };

    before(() => {
        cy.env<{
            TEST_ADMIN_USER_LOGIN: string;
            TEST_ADMIN_USER_PASSWORD: string;
            TEST_USER_LOGIN: string;
            TEST_USER_PASSWORD: string;
        }>(['TEST_ADMIN_USER_LOGIN', 'TEST_ADMIN_USER_PASSWORD', 'TEST_USER_LOGIN', 'TEST_USER_PASSWORD']).then(
            (credentials) => {
                adminTestUser = {
                    login: credentials.TEST_ADMIN_USER_LOGIN,
                    password: credentials.TEST_ADMIN_USER_PASSWORD,
                };
                testUser = { login: credentials.TEST_USER_LOGIN, password: credentials.TEST_USER_PASSWORD };
            },
        );
    });

    beforeEach(() => {
        cy.setupKeycloakStateCookieRelay();
        cy.visit('/');
    });

    it('should show the login button when logged out', () => {
        cy.getByTestId('header-burgermenu').click();
        cy.getByTestId('login-button').should('exist');
    });

    it('should not be able to access templates without login', () => {
        cy.visit('/templates');
        cy.getByTestId('authentication-prompt-lock').should('exist');
    });

    it('should show correct admin user login and icon, and support logout', () => {
        cy.keycloakUiLogin(adminTestUser.login, adminTestUser.password);
        cy.getByTestId('header-burgermenu').click();

        cy.getByTestId('user-info-box').should('have.text', 'admin@test.com');
        cy.getByTestId('admin-icon').should('exist');
        cy.getByTestId('login-button').should('not.exist');

        cy.keycloakUiLogout();
        cy.location('pathname').should('eq', '/en');
        clickBurgermenuUntilOpen();
        cy.getByTestId('login-button').should('exist');
    });

    it('should navigate to settings when logged in as an admin user', () => {
        cy.keycloakUiLogin(adminTestUser.login, adminTestUser.password);
        cy.getByTestId('header-burgermenu').click();

        cy.getByTestId('settings-menu-icon').should('exist').click();
        cy.getByTestId('settings-route-page').should('exist');
        cy.getByTestId('settings-header').should('contain.text', 'Settings');
    });

    it('should show correct user login and icon, and block the settings route', () => {
        cy.keycloakUiLogin(testUser.login, testUser.password);
        cy.getByTestId('header-burgermenu').click();

        cy.getByTestId('user-info-box').should('have.text', 'test@test.com');
        cy.getByTestId('user-icon').should('exist');
        cy.getByTestId('login-button').should('not.exist');

        cy.visit('/settings');
        cy.getByTestId('not-allowed-prompt-lock').should('exist');

        cy.visit('/templates');
        cy.getByTestId('templates-route-page').should('exist');
        cy.getByTestId('templates-header').should('include.text', 'Templates');
    });
});
