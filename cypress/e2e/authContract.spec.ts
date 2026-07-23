// The one spec that intentionally drives the real login/logout button and Keycloak's
// hosted login form (via cy.origin), instead of the programmatic `cy.loginAs()` used
// everywhere else. This is what actually proves the browser-facing auth contract
// (button -> Keycloak redirect -> callback -> session cookie -> role-based UI) works
// end to end; every other authenticated spec trusts that contract and skips straight
// to a minted session for speed.
describe('Keycloak login/logout and role-based access', { tags: '@auth' }, () => {
    const adminTestUser = {
        login: Cypress.env('TEST_ADMIN_USER_LOGIN'),
        password: Cypress.env('TEST_ADMIN_USER_PASSWORD'),
    };
    const testUser = {
        login: Cypress.env('TEST_USER_LOGIN'),
        password: Cypress.env('TEST_USER_PASSWORD'),
    };

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
        cy.getByTestId('header-burgermenu').click();
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
