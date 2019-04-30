'use strict';

const DriverLicense = require('./src/driver.license');

function makeResponse (result) {
    let res = {
        statusCode: 200,
        body: 'check parameters'
    };

    if (result.state != 'ok') {
        res.body = JSON.stringify({errorCode: 1, message: result.msg});
    }
    else {
        res.body = JSON.stringify({errorCode: 0, message: result.msg});
    }

    return res;
}

/**
 * Content-type : application/json
 * @param event
 * @returns {Promise<*>}
 */
module.exports.checkDriverLicense = async (event) => {
  try {
      let data = JSON.parse(event.body);
      console.log(data);
      let result = await new DriverLicense().set(data).check();
      console.log(result);
      return makeResponse(result);
  }
  catch (e) {
     console.error(e);
     return {'statusCode':e.code || 500, body: JSON.stringify({errorCode: 1, message: e.message})};
  }
};
