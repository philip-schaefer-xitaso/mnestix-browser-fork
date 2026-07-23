// This spec talks to a real third-party host (vws.xitaso.com) instead of a seeded
// fixture, which is why it is tagged @external and excluded from the default CI run
// (see cypress.config.ts's grepTags default). It is kept because building an
// equivalent local fixture requires a HandoverDocumentation submodel with a real
// attached preview-image file, which was out of scope for this pass - replacing this
// with a seeded fixture is a good follow-up.
describe('Test DocumentComponent', { tags: '@external' }, () => {
    beforeEach(() => {
        cy.setResolution([1920, 1080]);
        cy.visitViewer('https://vws.xitaso.com/aas/mnestix');
        cy.getByTestId('submodel-tab').contains('HandoverDocumentation').click();
    });

    it('should display document with correct title and organization', () => {
        cy.getByTestId('document-title').should('contain', 'Mnestix');
        cy.getByTestId('document-organization').should('contain', 'XITASO');
    });

    it('should display preview image if available', () => {
        cy.getByTestId('document-preview-image')
            .should('be.visible')
            .should('have.attr', 'src')
            .and(
                'contain',
                'repo/submodels/aHR0cHM6Ly9leGFtcGxlLmNvbS9pZHMvc20vNzc5MV8xMzA3XzMxMzFfNTg3Mw/submodel-elements/Document.DocumentVersion.PreviewFile/attachment',
            );
    });

    it('should have a working open button', () => {
        cy.getByTestId('document-open-button').should('exist').should('not.be.disabled');
    });

    it('should open the details dialog when the info button is clicked', () => {
        cy.getByTestId('document-info-button').click();
        cy.getByTestId('document-details-dialog').should('be.visible');
        cy.get('[aria-label="close"]').click();
        cy.getByTestId('document-details-dialog').should('not.exist');
    });
});
