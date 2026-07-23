describe('Test all Aas List features', { tags: '@critical' }, () => {
    before(() => {
        cy.postListAasMockData();
    });

    after(() => {
        cy.deleteListAasMockData();
    });

    beforeEach(() => {
        cy.setResolution([1920, 1080]);
        cy.visit('/list');
    });

    it('should load the first list page of the default repository and display the data', () => {
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest1')
            .findByTestId('list-aasId')
            .contains('https://mnestix.io/aas/listTest1');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest1')
            .findByTestId('list-assetId')
            .contains('https://mnestix.io/listTest1');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest1')
            .findByTestId('list-manufacturer-name')
            .contains('listTest1 Manufacturer Name');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest1')
            .findByTestId('list-product-designation')
            .contains('listTest1 Product Designation');

        cy.getByTestId('list-row-https://mnestix.io/aas/listTest2')
            .findByTestId('list-aasId')
            .contains('https://mnestix.io/aas/listTest2');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest2')
            .findByTestId('list-assetId')
            .contains('https://mnestix.io/listTest2');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest2')
            .findByTestId('list-manufacturer-name')
            .contains('listTest2 Manufacturer Name');
        cy.getByTestId('list-row-https://mnestix.io/aas/listTest2')
            .findByTestId('list-product-designation')
            .contains('listTest2 Product Designation');
    });
});
