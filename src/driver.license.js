/**
 * Created by aleckim on 2019-04-18.
 */

'use strict';

const request = require('request-promise-native');
const cheerio = require('cheerio');

const webSite = 'https://www.safedriving.or.kr';
const submitPage = '/LnrForRtnLicns/LnrForRtnLicnsTruthYnComplete.do';

class DriverLicense {
    constructor() {
        this.uri = webSite + submitPage;
    }

    set(data) {
        this.options = this._setOptions(data);
        return this;
    }

    _setOptions(opts) {
        if ( opts.licenLocal == undefined
            || opts.sName == undefined
            || opts.sJumin1 == undefined
            || opts.licence01 == undefined
            || opts.licence02 == undefined
            || opts.licence03 == undefined
            || opts.licence04 == undefined
            || opts.serialNum == undefined ) {

            let error = new Error('Invalid parameters');
            error.code = 400;
            throw error;
        }

        return {
            uri : this.uri,
            method : "POST",
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
            timeout: 150000
        }
    }

    _parseResult(body) {
        let $ = cheerio.load(body);
        let result = $('.ul_list');
        if (result == undefined) {
            return {state: 'error', msg: 'unknown error'};
        }

        try {
            let txt1 = $('li', '.ul_list').eq(0).text();
            let txt2 = $('li', '.ul_list').eq(1).text();

            let check1 = $('li', '.ul_list').eq(0).attr('style');
            let check2 = $('li', '.ul_list').eq(1).attr('style');

            if (check1 == undefined && check2 == undefined) {
                //txt1: '암호일련번호가 일치합니다.', txt2: '도로교통공단 전산 자료와 일치합니다.'
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

    check() {
        return request(this.options)
            .then(result => {
                return this._parseResult(result);
            });
    }
}

module.exports = DriverLicense;
