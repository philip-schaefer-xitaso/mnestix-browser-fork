import resolutions from '../fixtures/resolutions.json';
import thumbnailAasMockData from '../fixtures/cypress_e2e/ThumbnailFileMockData/thumbnailAasMockData.json';

resolutions.forEach((res) => {
    describe(`Thumbnail image (Resolution: ${res})`, () => {
        describe('loaded from file', () => {
            before(() => {
                cy.postTestThumbnailAas();
                cy.uploadThumbnailToAas(thumbnailAasMockData.id);
            });

            after(() => {
                cy.deleteThumbnailFromAas(thumbnailAasMockData.id);
                cy.deleteTestThumbnailAas();
            });

            it('should load thumbnail from file and visualize it in detail view', () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.visitViewer(thumbnailAasMockData.id);
                cy.getByTestId('default-thumbnail-image-with-fallback').should('not.exist');
                cy.getByTestId('image-with-fallback')
                    .should('be.visible')
                    .and((img) => {
                        expect(img[0].naturalWidth).to.be.greaterThan(0);
                        expect(img[0].naturalHeight).to.be.greaterThan(0);
                    });
            });

            it('should load thumbnail from file and visualize it in list view', () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.visit('/list');
                cy.getByTestId('list-row-https://mnestix.io/aas/thumbnail_1').as('testAas');
                cy.get('@testAas')
                    .findByTestId('image-with-fallback')
                    .should('be.visible')
                    .and((img) => {
                        expect(img[0].naturalWidth).to.be.greaterThan(0);
                        expect(img[0].naturalHeight).to.be.greaterThan(0);
                    });
                cy.get('@testAas').findByTestId('default-thumbnail-image-with-fallback').should('not.exist');
            });
        });

        describe('not loaded from file', () => {
            before(() => {
                cy.postTestThumbnailAas();
            });

            after(() => {
                cy.deleteTestThumbnailAas();
            });

            it('should not load thumbnail from file and show default image in detail view', () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.visitViewer(thumbnailAasMockData.id);
                cy.getByTestId('default-thumbnail-image-with-fallback').should('exist');
                cy.getByTestId('image-with-fallback').should('not.exist');
            });

            it('should not load thumbnail from file and show default image in list view', () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.visit('/list');
                cy.getByTestId('list-row-https://mnestix.io/aas/thumbnail_1').as('testAas');
                cy.get('@testAas').findByTestId('image-with-fallback').should('not.exist');
                cy.get('@testAas').findByTestId('default-thumbnail-image-with-fallback').should('exist');
            });
        });
    });
});
