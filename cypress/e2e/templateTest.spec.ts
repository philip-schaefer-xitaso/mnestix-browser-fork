describe('Template CRUD operations', { tags: '@critical' }, () => {
    const uniqueId = Date.now();
    const editedTemplateName = `Test Template ${uniqueId} (edited)`;

    beforeEach(() => {
        cy.loginAs('admin');
        cy.setResolution([1920, 1080]);

        cy.visit('/templates');
        cy.url().should('match', /\/templates$/);
        cy.getByTestId('templates-route-page').should('be.visible');
    });

    it('should create, edit and delete a template', () => {
        cy.getByTestId('create-new-template-button').click();
        cy.getByTestId('choose-template-dialog').should('be.visible');

        cy.getByTestId('choose-template-item-0').should('be.visible');
        cy.getByTestId('choose-template-item-0').find('h4').first().click();
        cy.url().should('match', /\/templates\/.+/);

        cy.getByTestId('display-name-input').should('be.visible');
        cy.getByTestId('display-name-input').invoke('val', editedTemplateName);
        cy.getByTestId('display-name-input').trigger('input', { force: true });
        cy.getByTestId('display-name-input').blur({ force: true });

        cy.getByTestId('save-changes-button').should('be.enabled').click();
        cy.expectSuccessNotification();

        cy.getByTestId('more-options-button').click();
        cy.getByTestId('more-options-menu').should('be.visible');
        cy.getByTestId('delete-template-button').click();
        cy.getByTestId('confirm-delete-button').click();

        cy.url().should('match', /\/templates$/);
        cy.getByTestId('templates-route-page').should('be.visible');
    });
});
