import testAAS from '../fixtures/testAAS.json';
import AASBomComponent from '../fixtures/cypress_e2e/cyTestAas_BoM_Component.json';

const testdata = {
    entityToTest: 0,
    bomSubmodelName: 'BillOfMaterial',
    redirectComponentName: 'Cy_BoM_Component',
    propertyTestCollection: 'Cypress_Test_02',
    multiLanguageTest: 'MultiLanguageProperty',
    multiLangEn: 'Bill Of Material Multilanguage',
    booleanTest: 'Boolean',
    booleanTrueTest: true,
};

describe('Test the Bill-of-Material', { tags: '@critical' }, () => {
    before(() => {
        cy.postTestAas();
        cy.postShell(AASBomComponent);
    });

    after(() => {
        cy.deleteTestAas();
        cy.deleteTestAasBomComponent();
    });

    beforeEach(() => {
        cy.setResolution([1920, 1080]);
        cy.visitViewer(testAAS.aasId);
        cy.getByTestId('submodel-tab').contains(testdata.bomSubmodelName).click();
    });

    it('should open and close the entity info popup', () => {
        cy.getByTestId('entity-info-icon').should('exist').as('bom-info-icons');
        cy.get('@bom-info-icons').eq(testdata.entityToTest).click();
        cy.getByTestId('bom-info-popup').should('be.visible');
        cy.getByTestId('data-row-title').contains('asset').should('exist').as('assetIdDataRow');

        cy.get('body').click(0, 0);
        cy.getByTestId('bom-info-popup').should('not.exist');
    });

    it('should close and reopen tree tabs', () => {
        cy.getByTestId('tree-item-label').should('exist').eq(0).as('firstEntityOpen');
        cy.get('@firstEntityOpen').click();
        cy.getByTestId('bom-entity').should('have.length', 1);
        cy.getByTestId('tree-item-label').should('exist').eq(0).as('firstEntityClosed');

        cy.get('@firstEntityClosed').click();
        cy.getByTestId('bom-entity').should('have.length.gt', 1);
    });

    it('should show a button that redirects to the BoM component', () => {
        cy.getByTestId('bom-entity')
            .contains(testdata.redirectComponentName)
            .parents('[data-testid="bom-entity"]')
            .as('cyBomComponent');
        cy.get('@cyBomComponent').findByTestId('view-asset-button').should('exist');
    });

    it('should find a multi-language string under "Cypress Test 02"', () => {
        cy.getByTestId('bom-entity')
            .contains(testdata.propertyTestCollection)
            .parents('[data-testid="bom-entity"]')
            .as('cyPropertyTestCollection');
        cy.get('@cyPropertyTestCollection').click();
        cy.getByTestId('bom-entity')
            .contains(testdata.multiLanguageTest)
            .parents('[data-testid="bom-entity"]')
            .as('cyMultiLangTest');
        cy.get('@cyMultiLangTest').should('contain', testdata.multiLangEn);
    });

    it('should find a boolean under "Cypress Test 02"', () => {
        cy.getByTestId('bom-entity')
            .contains(testdata.propertyTestCollection)
            .parents('[data-testid="bom-entity"]')
            .as('cyPropertyTestCollection');
        cy.get('@cyPropertyTestCollection').click();
        cy.getByTestId('bom-entity')
            .contains(testdata.booleanTest)
            .parents('[data-testid="bom-entity"]')
            .as('cyBooleanTest');
        cy.get('@cyBooleanTest').should('contain', testdata.booleanTrueTest);
    });
});
