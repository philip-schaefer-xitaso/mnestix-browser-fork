import testAAS from '../fixtures/testAAS.json';
import resolutions from '../fixtures/resolutions.json';
import toBase64 from '../support/base64-conversion';

const testData = {
    submodelTabToClick: 'cyDropdown',
    dropdownContent: 'Test',
    testUrl: 'https://mnestix.io',
    testNoUrl: 'Test',
    propertyNoUrl: 'Property_no_link',
    propertyUrl: 'Property_link',
    mlpropertyNoUrl: 'MultiLanguageProperty_no_link',
    mlpropertyUrl: 'MultiLanguageProperty_link',
};

describe('Test the viewer page', { tags: '@critical' }, () => {
    before(() => {
        cy.postTestAas();
    });

    after(() => {
        cy.deleteTestAas();
    });

    describe('Check the submodel tabs', () => {
        beforeEach(() => {
            cy.visitViewer(testAAS.aasId);
        });

        resolutions.forEach((res) => {
            it(`test on resolution: ${res}`, () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.getByTestId('submodel-tab').contains(testData.submodelTabToClick, { matchCase: false }).click();
                cy.getByTestId('data-row-title').contains('Cypress').should('be.visible');
            });
        });
    });

    describe('Test the dropdown boxes', () => {
        beforeEach(() => {
            cy.visitViewer(testAAS.aasId);
        });

        resolutions.forEach((res) => {
            it(`shows hidden content when clicked on (Resolution: ${res})`, () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);

                cy.getByTestId('submodel-tab').contains(testData.submodelTabToClick).click();
                cy.getByTestId('submodelOverviewLoadingSkeleton').should('not.exist');
                cy.getByTestId('submodel-dropdown-button').contains('show', { matchCase: false }).as('dropdown');
                cy.getByTestId('data-row-title')
                    .contains(testData.dropdownContent, { matchCase: false })
                    .should('not.exist');

                cy.get('@dropdown').click();
                cy.getByTestId('submodel-dropdown-button').contains('hide', { matchCase: false });
                cy.getByTestId('data-row-title')
                    .contains(testData.dropdownContent, { matchCase: false })
                    .should('be.visible');
            });
        });
    });

    describe('Test if links are formatted correctly', () => {
        beforeEach(() => {
            cy.visitViewer(testAAS.aasId);
        });

        resolutions.forEach((res) => {
            it(`test on resolution: ${res}`, () => {
                cy.setResolution(res as [number, number] | Cypress.ViewportPreset);
                cy.getByTestId('submodel-tab').contains(testData.submodelTabToClick).click();
                cy.getByTestId('submodel-dropdown-button').contains('show', { matchCase: false }).as('dropdown');
                cy.get('@dropdown').click();

                // data-row-title and the value's testid (property-content/mlproperty-content)
                // are siblings under the same DataRow container, not ancestor/descendant, so we
                // go up to that shared parent before searching back down for the value.
                cy.getByTestId('data-row-title')
                    .contains(testData.propertyNoUrl, { matchCase: false })
                    .parent()
                    .findByTestId('property-content')
                    .contains(testData.testNoUrl)
                    .should('not.have.attr', 'href');

                cy.getByTestId('data-row-title')
                    .contains(testData.propertyUrl, { matchCase: false })
                    .parent()
                    .findByTestId('property-content')
                    .contains(testData.testUrl)
                    .should('have.attr', 'href');

                cy.getByTestId('data-row-title')
                    .contains(testData.mlpropertyUrl, { matchCase: false })
                    .parent()
                    .findByTestId('mlproperty-content')
                    .contains(testData.testUrl)
                    .should('have.attr', 'href');

                cy.getByTestId('data-row-title')
                    .contains(testData.mlpropertyNoUrl, { matchCase: false })
                    .parent()
                    .findByTestId('mlproperty-content')
                    .contains(testData.testNoUrl)
                    .should('not.have.attr', 'href');
            });
        });
    });

    describe('Mobile-only interactions', { tags: '@mobile' }, () => {
        before(() => {
            cy.viewport('iphone-6');
            cy.visit('/viewer/' + toBase64(testAAS.aasId));
        });

        it('should expand/collapse the top-of-page accordion dropdown', () => {
            cy.getByTestId('mobile-accordion-header')
                .contains('Asset Administration Shell', { matchCase: false })
                .as('mobileDropdown');
            cy.getByTestId('mobile-accordion-content').as('mobileDropdownContent');
            cy.get('@mobileDropdownContent').should('not.be.visible');

            cy.get('@mobileDropdown').click();
            cy.get('@mobileDropdownContent').should('be.visible');
        });
    });
});
