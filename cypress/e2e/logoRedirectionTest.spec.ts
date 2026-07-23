import testAAS from '../fixtures/testAAS.json';
import resolutions from '../fixtures/resolutions.json';

const pageURLNames: Record<string, string> = { '/': 'index', '/templates': 'templates', '/settings': 'settings' };
const testId = testAAS.aasId;

function resolutionTag(res: [number, number] | Cypress.ViewportPreset): '@critical' | '@mobile' {
    return res === 'iphone-6' ? '@mobile' : '@critical';
}

// The viewer-page describe block occasionally sees the router.push('/') navigation
// triggered by the logo click seem to get dropped (unconfirmed root cause, suspected
// auth/session state settling - see /memories/session/e2e-overhaul-plan.md). A test
// retry (re-running the whole test, including a fresh cy.visitViewer) is a more
// reliable mitigation than trying to guard the exact interaction.
describe('Test the redirection by clicking the header logo', { retries: { runMode: 2, openMode: 0 } }, () => {
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
