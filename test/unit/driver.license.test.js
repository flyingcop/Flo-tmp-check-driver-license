'use strict';

jest.mock('request-promise-native', () => jest.fn());

const request = require('request-promise-native');
const DriverLicense = require('../../src/driver.license');

function createValidData(overrides) {
    return Object.assign({
        licenLocal: '19',
        sName: '김동환',
        sJumin1: '791121',
        licence01: '19',
        licence02: '01',
        licence03: '00476',
        licence04: '32',
        serialNum: 'X67UK'
    }, overrides);
}

function createHtml(listItems) {
    const liHtml = listItems.map(item => {
        const styleAttr = item.style ? ` style="${item.style}"` : '';
        const text = item.text || '';
        return `<li${styleAttr}>${text}</li>`;
    }).join('');
    return `<ul class="ul_list">${liHtml}</ul>`;
}

describe('DriverLicense _setOptions validation', () => {
    test('returns options for valid data', () => {
        const driverLicense = new DriverLicense();
        const data = createValidData();

        const options = driverLicense._setOptions(data);

        expect(options).toBeDefined();
        expect(options.method).toBe('POST');
        expect(options.uri).toContain('safedriving.or.kr');
        expect(options.form).toMatchObject({
            licenLocal: data.licenLocal,
            sName: data.sName,
            sJumin1: data.sJumin1,
            licence01: data.licence01,
            licence02: data.licence02,
            licence03: data.licence03,
            licence04: data.licence04,
            serialNum: data.serialNum
        });
    });

    ['licenLocal', 'sName', 'sJumin1', 'licence01', 'licence02', 'licence03', 'licence04', 'serialNum'].forEach(field => {
        test(`throws error when ${field} is missing`, () => {
            const driverLicense = new DriverLicense();
            const data = createValidData();
            delete data[field];

            let error;
            try {
                driverLicense._setOptions(data);
            }
            catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(Error);
            expect(error.code).toBe(400);
            expect(error.message).toBe('Invalid parameters');
        });
    });
});

describe('DriverLicense _parseResult', () => {
    test('returns ok when both messages have no style', () => {
        const html = createHtml([
            { text: '암호일련번호가 일치합니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(html);

        expect(result).toEqual({
            state: 'ok',
            msg: '도로교통공단 전산 자료와 일치합니다.'
        });
    });

    test('returns error from first item when first has style', () => {
        const html = createHtml([
            { style: 'color:red;', text: '암호일련번호가 일치하지 않습니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(html);

        expect(result).toEqual({
            state: 'error',
            msg: '암호일련번호가 일치하지 않습니다.'
        });
    });

    test('returns error from second item when second has style', () => {
        const html = createHtml([
            { text: '암호일련번호가 일치합니다.' },
            { style: 'color:red;', text: '도로교통공단 전산 자료와 일치하지 않습니다.' }
        ]);
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(html);

        expect(result).toEqual({
            state: 'error',
            msg: '도로교통공단 전산 자료와 일치하지 않습니다.'
        });
    });

    test('returns unknown error when style exists but messages are empty', () => {
        const html = createHtml([
            { style: 'color:red;' },
            { }
        ]);
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(html);

        expect(result.state).toBe('error');
        expect(result.msg).toBe('unknown error');
    });
});

describe('DriverLicense.check', () => {
    beforeEach(() => {
        request.mockReset();
    });

    test('resolves ok when remote HTML indicates success', async () => {
        const html = createHtml([
            { text: '암호일련번호가 일치합니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        request.mockResolvedValueOnce(html);

        const driverLicense = new DriverLicense();
        const data = createValidData();

        const result = await driverLicense.set(data).check();

        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'POST',
            uri: expect.stringContaining('safedriving.or.kr')
        }));
        expect(result).toEqual({
            state: 'ok',
            msg: '도로교통공단 전산 자료와 일치합니다.'
        });
    });

    test('resolves error when remote HTML indicates validation error', async () => {
        const html = createHtml([
            { style: 'color:red;', text: '암호일련번호가 일치하지 않습니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        request.mockResolvedValueOnce(html);

        const driverLicense = new DriverLicense();
        const data = createValidData();

        const result = await driverLicense.set(data).check();

        expect(request).toHaveBeenCalledTimes(1);
        expect(result.state).toBe('error');
        expect(result.msg).toBe('암호일련번호가 일치하지 않습니다.');
    });
});
