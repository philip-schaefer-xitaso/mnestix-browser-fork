import testAAS from '../fixtures/cypress_e2e/cypressTestAas.json';
import testInternalLinkedSub from '../fixtures/cypress_e2e/Submodels/cyTimeSeries_Internal_and_Linked.json';
import testInternalLinkedSubRef from '../fixtures/cypress_e2e/Submodels/cyTimeSeries_Internal_Linked_SubmodelReference.json';
import toBase64 from '../support/base64-conversion';

describe('Test the internal TimeSeries', { tags: '@critical' }, () => {
    const encodedAasId = toBase64(testAAS.id);

    before(() => {
        cy.repoRequest('POST', '/shells', testAAS);
        cy.postSubmodelToAas(encodedAasId, testInternalLinkedSub, testInternalLinkedSubRef);
    });

    after(() => {
        cy.repoRequest('DELETE', '/shells/' + encodedAasId, null);
        cy.repoRequest('DELETE', '/submodels/' + toBase64(testInternalLinkedSub.id), null);
    });

    beforeEach(() => {
        cy.visitViewer(testAAS.id);
    });

    it('should render the internal timeseries submodel as a line chart', () => {
        cy.getByTestId('submodel-tab').contains('TimeSeries').should('be.visible').click();
        const wrapper = () => cy.getByTestId('timeseries-internal-wrapper');
        wrapper().should('exist');
        const lineChart = wrapper().getByTestId('timeseries-line-chart');
        lineChart.should('exist');
        lineChart.find('.recharts-dot').should('have.length', 6);
    });
});

describe('Test the linked TimeSeries', { tags: '@critical' }, () => {
    const encodedAasId = toBase64(testAAS.id);

    after(() => {
        cy.repoRequest('DELETE', '/shells/' + encodedAasId, null);
        cy.repoRequest('DELETE', '/submodels/' + toBase64(testInternalLinkedSub.id), null);
    });

    it('should fetch data from the linked InfluxDB-backed timeseries submodel', () => {
        cy.repoRequest('POST', '/shells', testAAS);
        cy.postSubmodelToAas(encodedAasId, testInternalLinkedSub, testInternalLinkedSubRef);

        cy.intercept('POST', 'http://localhost:8086/api/v2/***', {}).as('influxIntercept');
        cy.visitViewer(testAAS.id);

        cy.getByTestId('submodel-tab').contains('TimeSeries').should('be.visible').click();
        cy.wait('@influxIntercept');
    });
});
