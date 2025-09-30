import { expect } from 'chai';
import { CodeGeneratorGroupSettings, ModelUtils, isNullOrEmpty } from '../src';
import { initGenerator } from './testUtils';

setTimeout(async () => {
    await initGenerator();

    describe('Code generator settings validator tests', () => {
        const convertor = ModelUtils.getCodeGeneratorSettingsConvertor();

        it('CSharp / Namespace -> Missing value', () => {
            const settings: CodeGeneratorGroupSettings = { ['CSharp']: { "Namespace": "" } };
            const result = convertor.validateSettings('NetCoreResxCsharp01', settings);
            expect(result).to.be.an('object');
            expect(isNullOrEmpty(result.error)).to.be.false;
            expect(result.errorCode).to.equal('csharp.namespace.missing');
            expect(result.group).to.equal('CSharp');
            expect(result.property).to.equal('Namespace');
        });

        it('CSharp / Namespace -> Wrong chars in name', () => {
            const values = ['1Namespace', 'Namespace1.', '.Namespace-1', '-Namespace.1', 'Namespace_1-'];

            const settings: CodeGeneratorGroupSettings = { ['CSharp']: { "Namespace": "" } };

            values.forEach(value => {
                settings['CSharp']['Namespace'] = value;
                const result = convertor.validateSettings('NetCoreResxCsharp01', settings);
                expect(result).to.be.an('object');
                expect(isNullOrEmpty(result.error), `CSharp/Namespace/${value}`).to.be.false;
                expect(result.errorCode).to.equal('csharp.namespace.invalidformat');
                expect(result.group).to.equal('CSharp');
                expect(result.property).to.equal('Namespace');
            });
        });
    });

    run();

}, 500);
