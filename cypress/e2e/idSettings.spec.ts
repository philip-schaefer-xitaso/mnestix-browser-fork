// Occasionally the app unexpectedly navigates to the home page mid-test at an
// unpredictable point (unconfirmed root cause, suspected auth/session state
// settling - see /memories/session/e2e-overhaul-plan.md). Since it can happen
// at any single interaction, a full test retry (re-running beforeEach's fresh
// login+navigation and the whole test body from scratch) is a more reliable
// mitigation than trying to guard every individual step.
describe('Visit the Settings page', { tags: '@critical', retries: { runMode: 2, openMode: 0 } }, () => {
    beforeEach(() => {
        cy.loginAs('admin');
        cy.setResolution([1920, 1080]);
        cy.getByTestId('header-burgermenu').click();
    });

    it('should open the Settings page', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.getByTestId('settings-card-header').should('be.visible');
    });

    it('should display ID structure settings and allow editing', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.contains('ID structure').should('be.visible');

        cy.getByTestId('settings-edit-button').click();

        cy.getByTestId('settings-edit-text-field-0').should('be.visible');
        cy.getByTestId('settings-cancel-button').should('be.visible');
        cy.getByTestId('settings-save-button').should('be.visible');
    });

    it('should save ID structure settings successfully', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.getByTestId('settings-edit-button').click();

        const prefixValues = ['new-prefix-value-0', 'new-prefix-value-1'];
        const urlValues = ['https://example2.com', 'https://example3.com', 'https://example4.com'];

        // Fields 1 and 3 are idShort-type (assetIdShort, aasIdShort), fields 0, 2, 4 are IRI-type
        const shortIdFields = [1, 3];
        const iriFields = [0, 2, 4];

        prefixValues.forEach((value, i) => {
            cy.getByTestId(`settings-edit-text-field-${shortIdFields[i]}`).click();
            cy.getByTestId(`settings-edit-input-field-${shortIdFields[i]}`).clear();
            cy.getByTestId(`settings-edit-input-field-${shortIdFields[i]}`).type(value);
        });
        urlValues.forEach((value, i) => {
            cy.getByTestId(`settings-edit-text-field-${iriFields[i]}`).click();
            cy.getByTestId(`settings-edit-input-field-${iriFields[i]}`).clear();
            cy.getByTestId(`settings-edit-input-field-${iriFields[i]}`).type(value);
        });

        cy.getByTestId('settings-save-button').click();
        cy.expectSuccessNotification();

        prefixValues.forEach((value, i) => {
            cy.getByTestId(`settings-text-field-${shortIdFields[i]}`).should('contain', value);
        });
        urlValues.forEach((value, i) => {
            cy.getByTestId(`settings-text-field-${iriFields[i]}`).should('contain', value);
        });

        cy.getByTestId('settings-edit-text-field-0').should('not.exist');
    });

    it('should cancel ID structure settings changes', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.getByTestId('settings-edit-button').click();

        cy.getByTestId('settings-edit-input-field-0').invoke('val').as('originalValue');

        cy.getByTestId('settings-edit-input-field-0').clear();
        cy.getByTestId('settings-edit-input-field-0').type('test-value');

        cy.getByTestId('settings-cancel-button').click();
        cy.contains('test-value').should('not.exist');

        cy.getByTestId('settings-edit-button').click();
        cy.get('@originalValue').then((originalValue) => {
            cy.getByTestId('settings-edit-input-field-0').should('have.value', originalValue);
        });
    });

    it('should open asset ID documentation dialog', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.getByTestId('asset-id-redirect-documentation-dialog').click();
        cy.get('[role="dialog"]').should('be.visible');
        cy.getByTestId('asset-id-redirect-documentation-dialog').should('exist');

        cy.get('[aria-label="close"]').click();
        cy.get('[role="dialog"]').should('not.exist');
    });

    it('should display validation errors for invalid prefix AssetIdShort and AasId values', () => {
        cy.getByTestId('settings-menu-icon').click();
        cy.getByTestId('settings-edit-button').click();

        // AasId field
        cy.getByTestId('settings-edit-text-field-0').click();
        cy.getByTestId('settings-edit-input-field-0').clear();
        cy.getByTestId('settings-edit-input-field-0').type('invalid iri');

        // AssetIdShort field
        cy.getByTestId('settings-edit-text-field-1').click();
        cy.getByTestId('settings-edit-input-field-1').clear();
        cy.getByTestId('settings-edit-input-field-1').type('invalid iri');

        cy.getByTestId('settings-save-button').click();

        cy.getByTestId('settings-edit-text-field-0-error').as('error0');
        cy.get('@error0').should('be.visible');
        cy.get('@error0').should('contain', 'Has to be a valid IRI');

        cy.getByTestId('settings-edit-text-field-1-error').as('error1');
        cy.get('@error1').should('be.visible');
        cy.get('@error1').should('contain', 'Has to work as part of an IRI');
    });
});
