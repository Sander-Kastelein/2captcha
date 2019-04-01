# 2Captcha API wrapper for Node.js

Post a captcha to the [2Captcha](https://2captcha.com/) service, then polls until the captcha is decoded.

(!) THIS LIBRARY IS BASED ON OUTDATED API SPECS AND IS NO LONGER SUPPORTED.

## Installation

    npm install 2captcha


## Usage


Set up your api key:

    var solver = require('2captcha');

    solver.setApiKey('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');


Decode from a url, with a 10 seconds polling interval: (default = 2000ms)

    solver.decodeUrl(url, {pollingInterval: 10000}, function(err, result, invalid) {
        console.log(result.text);
    });

Decode from a url retrying 5 times if invalid is called (default = 3)

    solver.decodeUrl(url, {retries: 5}, function(err, result, invalid) {
        if(!checkIfCaptchaIsValid(result.text)){
        	return invalid();
        }
    });

