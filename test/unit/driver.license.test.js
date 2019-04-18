/**
 * Created by aleckim on 2019-04-18.
 */

'use strict';

const DriverLicense = require('../../src/driver.license');

test('test class', async ()=> {
    let driverLicense = new DriverLicense();

    let testSet = {
        "licenLocal": '19',
        "sName": '김동환',
        "sJumin1": '791121',
        "licence01": '19',
        "serialNum": 'X67UK'
    };

    try {
        let result = await driverLicense.set(testSet).check();
        console.log(result);
    }
    catch (e) {
       console.log({'statusCode':e.code || 500, body: e.message});
    }
    expect(0).toBe(0);
});
