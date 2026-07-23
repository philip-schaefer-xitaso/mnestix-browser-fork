import testAas from '../fixtures/testAAS.json';

const testAasId = testAas.aasId;
const testAssetId = testAas.assetId;

describe('Test the DNS Redirect', { tags: '@critical' }, () => {
    before(() => {
        cy.postTestAas();
    });

    after(() => {
        cy.deleteTestAas();
    });

    it('Visits the "/asset?assetId=URLEncodedAssetID" page and gets redirected to the corresponding viewer page', () => {
        cy.intercept({ method: 'POST', url: '/en/viewer/*' }).as('redirectedViewer');

        cy.visit('/asset?assetId=' + encodeURIComponent(testAssetId));
        cy.wait('@redirectedViewer');

        cy.url().should('contain', '/viewer/' + btoa(testAasId).replace(/=*$/g, ''));
        cy.getByTestId('aas-data').findByTestId('data-row-value').should('contain', testAasId);
        cy.getByTestId('asset-data').findByTestId('data-row-value').should('contain', testAssetId);
    });

    it('Visits the "/asset?aasId=URLEncodedAasId" page and gets redirected to the corresponding viewer page', () => {
        cy.intercept({ method: 'POST', url: '/en/viewer/*' }).as('redirectedViewer');

        cy.visit('/asset?aasId=' + encodeURIComponent(testAasId));
        cy.wait('@redirectedViewer');

        cy.url().should('contain', '/viewer/' + btoa(testAasId).replace(/=*$/g, ''));
        cy.getByTestId('aas-data').findByTestId('data-row-value').should('contain', testAasId);
    });
});
