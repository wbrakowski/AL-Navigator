import * as assert from 'assert';
import { RdlcFileLocator } from '../../al/report/rdlcFileLocator';

suite('RdlcFileLocator Tests', () => {
    test('Extract RDLC layout from rendering section', () => {
        const testALFileContent = `
        report 50101 MyReport
        {
            Caption = 'ReportName';
            UsageCategory = Administration;
            ApplicationArea = All;

            dataset
            {
                dataitem(Customer; Customer)
                {
                    column(no2_customer; "No.") { }
                }
            }

            rendering
            {
                layout("Purchase Order (RDLC)")
                {
                    Caption = 'Purchase Order (RDLC)';
                    LayoutFile = './src/Purchase/Document/PurchaseOrder.rdlc';
                    Summary = 'Detailed layout with all fields.';
                    Type = RDLC;
                }
            }
        }`;

        const expectedLayouts = ['./src/Purchase/Document/PurchaseOrder.rdlc'];

        const layouts = RdlcFileLocator.parseALFileForRDLCLayouts(testALFileContent, '/path/to/MyReport.al');
        assert.deepStrictEqual(layouts, expectedLayouts, 'Extracted layouts do not match the expected layouts.');
    });
});
