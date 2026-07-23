// The /compare route is deliberately disabled in production (see
// src/app/[locale]/compare/page.tsx, tracked in MNE-299) and force-redirects to
// home. This replaces the old comparison-feature E2E coverage (z_compareViewTest,
// listAasPageComparisonTest, and the comparison-list/compare-view assertions removed
// from listAasPageTest/thumbnailFileTest/qrScannerTest) with a single smoke test that
// the redirect still works, without asserting on any of the disabled feature's UI.
describe('Compare route redirect', { tags: '@critical' }, () => {
    it('redirects /compare to the home page', () => {
        cy.visit('/compare');
        // next-intl's routing.ts has no localePrefix override, which defaults to 'always',
        // so the home page always resolves under the default locale (/en), not the bare
        // baseUrl.
        cy.url().should('eq', `${Cypress.config().baseUrl}en`);
        cy.getByTestId('welcome-text').should('be.visible');
    });
});
