/**
 * Created by aleckim on 2019-04-18.
 */

'use strict';

const request = require('request-promise-native');
const cheerio = require('cheerio');

const rimsPath = '/rims/verifyPmDriverSingle';
const defaultTimeout = parseInt(process.env.RIMS_TIMEOUT_MS, 10) || 15000;
const PROVIDER_RIMS = 'rims';
const PROVIDER_SCRAPE = 'scrape';

const webSite = 'https://www.safedriving.or.kr';
const submitPage = '/LnrForRtnLicns/LnrForRtnLicnsTruthYnComplete.do';

function buildLicenseNo(opts) {
    return [
        opts.licence01,
        opts.licence02,
        opts.licence03,
        opts.licence04
    ].join('');
}

function normalizeProvider(provider) {
    if (provider == undefined || provider === '') {
        return (process.env.DRIVER_LICENSE_PROVIDER || PROVIDER_SCRAPE).toLowerCase();
    }
    return String(provider).toLowerCase();
}

class DriverLicense {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.RIMS_API_BASE;
    }

    set(data) {
        this.provider = normalizeProvider(data && data.provider);
        this.options = this._setOptions(this.provider, data);
        return this;
    }

    _setOptions(provider, opts) {
        // Support legacy signature _setOptions(opts) by detecting missing provider arg
        if (opts == undefined && provider != undefined && typeof provider === 'object') {
            opts = provider;
            provider = normalizeProvider(opts && opts.provider);
        }

        if (provider === PROVIDER_SCRAPE) {
            return this._setScrapeOptions(opts);
        }
        if (provider === PROVIDER_RIMS) {
            return this._setRimsOptions(opts);
        }

        let error = new Error('Invalid provider');
        error.code = 400;
        throw error;
    }

    _validateInputs(opts) {
        if (opts == undefined
            || opts.licenLocal == undefined
            || opts.sName == undefined
            || opts.sJumin1 == undefined
            || opts.licence01 == undefined
            || opts.licence02 == undefined
            || opts.licence03 == undefined
            || opts.licence04 == undefined
            || opts.serialNum == undefined) {

            let error = new Error('Invalid parameters');
            error.code = 400;
            throw error;
        }
    }

    _setRimsOptions(opts) {
        this._validateInputs(opts);

        if (!this.baseUrl) {
            let error = new Error('RIMS_API_BASE is required');
            error.code = 500;
            throw error;
        }

        let payload = {
            license_no: buildLicenseNo(opts),
            name: opts.sName,
            birth: opts.sJumin1,
            seq_no: opts.serialNum
        };
        let uri = this.baseUrl + rimsPath;

        return {
            uri: uri,
            method: 'POST',
            body: payload,
            json: true,
            resolveWithFullResponse: true,
            simple: false,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: defaultTimeout
        };
    }

    _setScrapeOptions(opts) {
        this._validateInputs(opts);

        return {
            uri: webSite + submitPage,
            method: 'POST',
            form: {
                "menuCode": "MN-PO-1241",
                "licenLocal": opts.licenLocal,
                "sName": opts.sName,
                "sJumin1": opts.sJumin1,
                "licence01": opts.licence01,
                "licence02": opts.licence02,
                "licence03": opts.licence03,
                "licence04": opts.licence04,
                "serialNum": opts.serialNum
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: defaultTimeout
        };
    }

    _parseRimsResult(response) {
        if (response == undefined) {
            return {state: 'error', msg: 'No response from RIMS API'};
        }

        let status = response.statusCode;
        let body = response.body || {};
        if (status !== 200) {
            let msg = body.message || `HTTP ${status}`;
            return {state: 'error', msg: msg, resultCode: body.resultCode};
        }

        if (body.errorCode != undefined && body.errorCode !== 0) {
            return {
                state: 'error',
                msg: body.message || 'unknown error',
                errorCode: body.errorCode,
                resultCode: body.resultCode
            };
        }

        let resultCode = body.resultCode || (body.raw && body.raw.body && body.raw.body.f_rtn_code) || '00';
        let maskedLicenseNo = body.maskedLicenseNo;

        if (body.isEligible === true || resultCode === '00') {
            return {
                state: 'ok',
                msg: 'Driver license verified',
                resultCode: resultCode,
                maskedLicenseNo: maskedLicenseNo
            };
        }

        if (body.isEligible === false || (resultCode && resultCode !== '00')) {
            return {
                state: 'error',
                msg: 'Driver license not eligible',
                resultCode: resultCode,
                maskedLicenseNo: maskedLicenseNo
            };
        }

        return {state: 'error', msg: 'unknown response'};
    }

    _parseScrapeResult(body) {
        let $ = cheerio.load(body);
        let items = $('li', '.ul_list');
        if (items.length === 0) {
            return {state: 'error', msg: 'unknown error'};
        }

        try {
            let txt1 = items.eq(0).text();
            let txt2 = items.eq(1).text();

            let check1 = items.eq(0).attr('style');
            let check2 = items.eq(1).attr('style');

            if (check1 == undefined && check2 == undefined && txt2.length > 0) {
                return {state: 'ok', msg: txt2};
            }
            else if (check1 != undefined && txt1.length > 0) {
                return {state: 'error', msg: txt1};
            }
            else if (check2 != undefined && txt2.length > 0) {
                return {state: 'error', msg: txt2};
            }
            else {
                return {state: 'error', msg: 'unknown error'};
            }
        }
        catch(e) {
            return {state: 'error', msg: e.message};
        }
    }

    _parseResult(response) {
        return this._parseRimsResult(response);
    }

    async _checkRims() {
        try {
            console.log(this.options);
            let response = await request(this.options);
            return this._parseRimsResult(response);
        }
        catch (e) {
            return {state: 'error', msg: e.message};
        }
    }

    async _checkScrape() {
        try {
            let html = await request(this.options);
            return this._parseScrapeResult(html);
        }
        catch (e) {
            return {state: 'error', msg: e.message};
        }
    }

    async check() {
        if (this.provider === PROVIDER_SCRAPE) {
            return this._checkScrape();
        }
        return this._checkRims();
    }
}

module.exports = DriverLicense;
