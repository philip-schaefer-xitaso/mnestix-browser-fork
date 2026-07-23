describe('Language Switch', { tags: '@critical' }, () => {
    it('changes the language from german to all available languages and shows correct values', () => {
        cy.visit('/de');

        cy.contains('Willkommen').should('be.visible');

        // spanish
        cy.getByTestId('language-selector').click();
        cy.getByTestId('language-es').click();
        cy.contains('Bienvenido').should('be.visible');
        cy.contains('Introducir manualmente').should('be.visible');

        // english
        cy.getByTestId('language-selector').click();
        cy.getByTestId('language-en').click();
        cy.contains('Welcome').should('be.visible');
        cy.contains('Enter manually').should('be.visible');

        // back to german
        cy.getByTestId('language-selector').click();
        cy.getByTestId('language-de').click();
        cy.contains('Willkommen').should('be.visible');
        cy.contains('Manuell eingeben').should('be.visible');
    });
});
