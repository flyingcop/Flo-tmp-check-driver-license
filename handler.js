'use strict';

const DriverLicense = require('./src/driver.license');

function makeResponse (result) {
    let res = {
        statusCode: 200,
        body: 'check parameters'
    };

    if (result.state != 'ok') {
        res.statusCode = 400;
    }

    res.body = result.msg;

    return res;
}

module.exports.checkDriverLicense = async (event) => {
  try {
      let result = await new DriverLicense().set(event).check();
      return makeResponse(200, result);
  }
  catch (e) {
     return {'statusCode':500, body: e.message};
  }
};
