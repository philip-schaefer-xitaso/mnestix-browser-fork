import resolutions from '../fixtures/resolutions.json';
import qrAas from '../fixtures/cypress_e2e/QrScannerMockData/cy_qrScannerAas.json';

// Drives a real getUserMedia video element (`scanner-video`), which requires a real
// webcam and a secure context (https, or localhost - which this app always runs as
// in the browser-facing scenarios here). It cannot run in the headless/dockerized
// Electron browser used by CI (see cypress.config.ts's default grepTags excluding
// @camera). Run explicitly with `cypress open --env grepTags=@camera`.
describe('Use the QR Scanner', { tags: '@camera' }, () => {
    const [qr1] = qrAas;

    before(() => {
        cy.postQrScannerMockData();
    });

    after(() => {
        cy.deleteQrScannerMockData();
    });

    resolutions.forEach((res) => {
        describe(`test on resolution: ${res}`, () => {
            beforeEach(() => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.visit('/');
            });

            it('should automatically be redirected to the right viewer page', () => {
                cy.getByTestId('scanner-start').click();
                cy.getByTestId('scanner-video').should('exist');
                cy.callScannerCallback(qr1.id);
                cy.url().should('contain', '/viewer/' + btoa(qr1.id).replace(/=*$/g, ''));
            });

            it('should close the QR scanner video and show the stopped state', () => {
                cy.getByTestId('scanner-start').click();
                cy.getByTestId('scanner-video').should('exist');
                cy.getByTestId('scanner-close-button').click();
                cy.getByTestId('scanner-video').should('not.exist');
                cy.getByTestId('scanner-start').should('exist');
            });

            it('should reshow the video on a wrong QR code', () => {
                cy.getByTestId('scanner-start').click();
                cy.getByTestId('scanner-video').should('exist');
                cy.callScannerCallback('wrongTestId');
                cy.getByTestId('scanner-video').should('not.exist');
                cy.expectErrorNotification('No AAS with the given ID.');
                cy.getByTestId('scanner-video').should('exist');
            });
        });
    });
});
