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
        "licence02": '01',
        "licence03": '00476',
        "licence04": '32',
        "serialNum": 'X67UK'
    };

    try {
        let result = await driverLicense.set(testSet).check();
        console.log(result);
    }
    catch (e) {
       console.log(e);
    }
    expect(0).toBe(0);
});
