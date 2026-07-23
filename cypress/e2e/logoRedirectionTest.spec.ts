import testAAS from '../fixtures/testAAS.json';
import resolutions from '../fixtures/resolutions.json';

const pageURLNames: Record<string, string> = { '/': 'index', '/templates': 'templates', '/settings': 'settings' };
const testId = testAAS.aasId;

function resolutionTag(res: [number, number] | Cypress.ViewportPreset): '@critical' | '@mobile' {
    return res === 'iphone-6' ? '@mobile' : '@critical';
}

describe('Test the redirection by clicking the header logo', () => {
    for (const url of Object.keys(pageURLNames)) {
        describe(`test the redirection on the ${pageURLNames[url]} page`, () => {
            resolutions.forEach((res) => {
                it(
                    `should click on the logo and be redirected to the home screen (Resolution: ${res})`,
                    { tags: resolutionTag(res as [number, number] | Cypress.ViewportPreset) },
                    () => {
                        cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                        cy.visit(url);
                        cy.getByTestId('header-logo').click();
                        cy.getByTestId('welcome-text').should('exist');
                    },
                );
            });
        });
    }

    describe('test the redirection on the viewer page', () => {
        before(() => {
            cy.postTestAas();
        });

        after(() => {
            cy.deleteTestAas();
        });

        resolutions.forEach((res) => {
            it(
                `should click on the logo and be redirected to the home screen (Resolution: ${res})`,
                { tags: resolutionTag(res as [number, number] | Cypress.ViewportPreset) },
                () => {
                    cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                    cy.visitViewer(testId);
                    cy.getByTestId('header-logo').click();
                    cy.getByTestId('welcome-text').should('exist');
                },
            );
        });
    });
});
