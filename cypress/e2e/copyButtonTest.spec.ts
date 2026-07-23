import testAAS from '../fixtures/testAAS.json';
import resolutions from '../fixtures/resolutions.json';
import toBase64 from '../support/base64-conversion';

describe('Test the copy button functionality', () => {
    before(() => {
        cy.postTestAas();
    });

    after(() => {
        cy.deleteTestAas();
    });

    describe('Test copying values in AASOverviewCard', () => {
        beforeEach(() => {
            cy.visitViewer(testAAS.aasId);
            cy.getByTestId('aas-data').should('be.visible');
            cy.getByTestId('submodelOverviewLoadingSkeleton').should('not.exist');
        });

        resolutions
            .filter((resolution) => resolution !== 'iphone-6')
            .forEach((res) => {
                it(
                    `should show and use regular copy button with hover in AASOverviewCard (Resolution: ${res})`,
                    { tags: '@critical' },
                    () => {
                        cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                        cy.getByTestId('datarow-aas-id-copy').should('not.be.visible');

                        cy.getByTestId('data-row-value').contains(testAAS.aasId).parent().trigger('mouseover');
                        cy.getByTestId('datarow-aas-id-copy').should('be.visible');
                        cy.window().then((win) => {
                            if (!win.navigator.clipboard) {
                                (win.navigator as unknown as { clipboard: Clipboard }).clipboard = {
                                    writeText: () => Promise.resolve(),
                                } as unknown as Clipboard;
                            }
                            cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
                        });
                        cy.getByTestId('datarow-aas-id-copy').first().click();
                        cy.get('@clipboardWrite').should('have.been.calledOnceWith', testAAS.aasId);
                        cy.expectSuccessNotification('Copied to clipboard');

                        cy.getByTestId('data-row-value').contains(testAAS.aasId).parent().trigger('mouseleave');
                        cy.getByTestId('copy-datarow-value').should('not.be.visible');
                    },
                );

                it(
                    `should show and use base64 copy buttons in DataRow for IDs (Resolution: ${res})`,
                    { tags: '@critical' },
                    () => {
                        cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                        cy.getByTestId('datarow-aas-id-copy-b64').should('not.be.visible');

                        cy.getByTestId('data-row-value').contains(testAAS.aasId).parent().trigger('mouseover');
                        cy.getByTestId('datarow-aas-id-copy-b64').should('be.visible');

                        cy.window().then((win) => {
                            if (!win.navigator.clipboard) {
                                (win.navigator as unknown as { clipboard: Clipboard }).clipboard = {
                                    writeText: () => Promise.resolve(),
                                } as unknown as Clipboard;
                            }
                            cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
                        });
                        cy.getByTestId('datarow-aas-id-copy-b64').first().click();
                        cy.get('@clipboardWrite').should('have.been.calledOnceWith', toBase64(testAAS.aasId));
                        cy.expectSuccessNotification('Copied to clipboard');

                        cy.getByTestId('data-row-value').contains(testAAS.aasId).parent().trigger('mouseleave');
                        cy.getByTestId('copy-datarow-value').should('not.be.visible');
                    },
                );
            });
    });
});
