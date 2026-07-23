import testAAS from '../fixtures/testAAS.json';
import resolutions from '../fixtures/resolutions.json';

describe('Visit the Viewer page', { tags: '@critical' }, () => {
    before(() => {
        cy.postTestAas();
    });

    after(() => {
        cy.deleteTestAas();
    });

    beforeEach(() => {
        cy.visit('/');
        cy.getByTestId('aasId-input').as('idInput');
    });

    resolutions.forEach((res) => {
        it(`should put an AAS Id into the input field, click the arrow and be redirected to the right viewer page (Resolution: ${res})`, () => {
            cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
            cy.get('@idInput').click();
            cy.get('@idInput').type(testAAS.aasId);
            cy.getByTestId('aasId-submit-button').click();
            cy.url().should('contain', '/viewer/' + btoa(testAAS.aasId).replace(/=*$/g, ''));
        });

        it(`should put an Asset Id into the input field, click the arrow and be redirected to the right viewer page (Resolution: ${res})`, () => {
            cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
            cy.get('@idInput').click();
            cy.get('@idInput').type(testAAS.assetId);
            cy.getByTestId('aasId-submit-button').click();
            cy.url().should('contain', '/viewer/' + btoa(testAAS.aasId).replace(/=*$/g, ''));
        });
    });
});
