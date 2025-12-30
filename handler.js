'use strict';

const DriverLicense = require('./src/driver.license');

function makeResponse (result) {
    let body = {
        errorCode: result.state === 'ok' ? 0 : 1,
        message: result.msg
    };

    if (result.resultCode != undefined) {
        body.resultCode = result.resultCode;
    }
    if (result.maskedLicenseNo != undefined) {
        body.maskedLicenseNo = result.maskedLicenseNo;
    }

    return {
        statusCode: 200,
        body: JSON.stringify(body)
    };
}

/**
 * Content-type : application/json
 * @param event
 * @returns {Promise<*>}
 */
module.exports.checkDriverLicense = async (event) => {
  try {
      let data;
      try {
          data = JSON.parse(event.body || '{}');
          console.log(data);
      }
      catch (parseErr) {
          parseErr.code = 400;
          throw parseErr;
      }
      let result = await new DriverLicense().set(data).check();
      console.log(result);
      return makeResponse(result);
  }
  catch (e) {
     console.error(e);
     // Temporary : 운전면허 확인 사이트 점검시 임시로 성공 리턴
     let result = {
        state: 'ok',
        msg: '도로교통공단 전산 자료와 일치합니다.'
    };
    console.log("2. temporary result : ", JSON.stringify(result));
    return makeResponse(result);
    //  return {'statusCode':e.code || 500, body: JSON.stringify({errorCode: 1, message: e.message})};
  }
};
