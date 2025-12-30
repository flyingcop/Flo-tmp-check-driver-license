'use strict';

jest.mock('request-promise-native', () => jest.fn());

const request = require('request-promise-native');
const DriverLicense = require('../../src/driver.license');

const RIMS_BASE_URL = 'https://rims.test';
const ORIGINAL_ENV = {
    RIMS_API_BASE: process.env.RIMS_API_BASE,
    DRIVER_LICENSE_PROVIDER: process.env.DRIVER_LICENSE_PROVIDER
};

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
    beforeEach(() => {
        process.env.RIMS_API_BASE = RIMS_BASE_URL;
        process.env.DRIVER_LICENSE_PROVIDER = 'rims';
    });

    test('returns options for valid data', () => {
        const driverLicense = new DriverLicense();
        const data = createValidData();

        const options = driverLicense._setOptions(data);

        expect(options).toBeDefined();
        expect(options.method).toBe('POST');
        expect(options.uri).toBe(`${RIMS_BASE_URL}/rims/verifyPmDriverSingle`);
        expect(options.body).toMatchObject({
            license_no: '1919010047632',
            name: data.sName,
            birth: data.sJumin1,
            seq_no: data.serialNum
        });
        expect(options.json).toBe(true);
        expect(options.resolveWithFullResponse).toBe(true);
    });

    test('returns scrape options when provider is scrape', () => {
        const driverLicense = new DriverLicense();
        const data = createValidData({ provider: 'scrape' });

        const options = driverLicense._setOptions('scrape', data);

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

describe('DriverLicense _parseRimsResult', () => {
    beforeEach(() => {
        process.env.RIMS_API_BASE = RIMS_BASE_URL;
        process.env.DRIVER_LICENSE_PROVIDER = 'rims';
    });

    test('returns ok when API says eligible', () => {
        const response = {
            statusCode: 200,
            body: {
                isEligible: true,
                resultCode: '00',
                maskedLicenseNo: '1*1*0*4*6*2'
            }
        };
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(response);

        expect(result).toEqual({
            state: 'ok',
            msg: 'Driver license verified',
            resultCode: '00',
            maskedLicenseNo: '1*1*0*4*6*2'
        });
    });

    test('returns error when API marks not eligible', () => {
        const response = {
            statusCode: 200,
            body: {
                isEligible: false,
                resultCode: '01'
            }
        };
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(response);

        expect(result.state).toBe('error');
        expect(result.resultCode).toBe('01');
        expect(result.msg).toBe('Driver license not eligible');
    });

    test('returns error when API responds with errorCode', () => {
        const response = {
            statusCode: 200,
            body: {
                errorCode: 500,
                message: 'internal error'
            }
        };
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(response);

        expect(result.state).toBe('error');
        expect(result.msg).toBe('internal error');
        expect(result.errorCode).toBe(500);
    });

    test('returns error when HTTP status is not 200', () => {
        const response = {
            statusCode: 502,
            body: { message: 'Bad gateway' }
        };
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseResult(response);

        expect(result.state).toBe('error');
        expect(result.msg).toBe('Bad gateway');
    });
});

describe('DriverLicense _parseScrapeResult', () => {
    beforeEach(() => {
        process.env.RIMS_API_BASE = RIMS_BASE_URL;
        delete process.env.DRIVER_LICENSE_PROVIDER;
    });

    test('returns ok when both messages have no style', () => {
        const html = createHtml([
            { text: '암호일련번호가 일치합니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        const driverLicense = new DriverLicense();

        const result = driverLicense._parseScrapeResult(html);

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

        const result = driverLicense._parseScrapeResult(html);

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

        const result = driverLicense._parseScrapeResult(html);

        expect(result).toEqual({
            state: 'error',
            msg: '도로교통공단 전산 자료와 일치하지 않습니다.'
        });
    });
});

describe('DriverLicense.check', () => {
    beforeEach(() => {
        process.env.RIMS_API_BASE = RIMS_BASE_URL;
        process.env.DRIVER_LICENSE_PROVIDER = 'rims';
        request.mockReset();
    });

    test('resolves ok when remote API returns eligible', async () => {
        const response = {
            statusCode: 200,
            body: {
                isEligible: true,
                resultCode: '00',
                maskedLicenseNo: '1*1*0*4*6*2'
            }
        };
        request.mockResolvedValueOnce(response);

        const driverLicense = new DriverLicense();
        const data = createValidData();

        const result = await driverLicense.set(data).check();

        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'POST',
            uri: `${RIMS_BASE_URL}/rims/verifyPmDriverSingle`
        }));
        expect(result).toEqual({
            state: 'ok',
            msg: 'Driver license verified',
            resultCode: '00',
            maskedLicenseNo: '1*1*0*4*6*2'
        });
    });

    test('resolves error when remote API returns non-200', async () => {
        const response = {
            statusCode: 500,
            body: { message: 'fail' }
        };
        request.mockResolvedValueOnce(response);

        const driverLicense = new DriverLicense();
        const data = createValidData();

        const result = await driverLicense.set(data).check();

        expect(request).toHaveBeenCalledTimes(1);
        expect(result.state).toBe('error');
        expect(result.msg).toBe('fail');
    });

    test('uses scraping provider when requested', async () => {
        const html = createHtml([
            { text: '암호일련번호가 일치합니다.' },
            { text: '도로교통공단 전산 자료와 일치합니다.' }
        ]);
        request.mockResolvedValueOnce(html);

        const driverLicense = new DriverLicense();
        const data = createValidData({ provider: 'scrape' });

        const result = await driverLicense.set(data).check();

        expect(request).toHaveBeenCalledTimes(1);
        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            uri: expect.stringContaining('safedriving.or.kr')
        }));
        expect(result.state).toBe('ok');
        expect(result.msg).toBe('도로교통공단 전산 자료와 일치합니다.');
    });
});

afterAll(() => {
    process.env.RIMS_API_BASE = ORIGINAL_ENV.RIMS_API_BASE;
    process.env.DRIVER_LICENSE_PROVIDER = ORIGINAL_ENV.DRIVER_LICENSE_PROVIDER;
});
