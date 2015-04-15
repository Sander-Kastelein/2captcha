/*
	index.js
	Sander Kastelein <sander@sanderkastelein.nl>
	2015-04-03
*/
"use strict";

var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');

var apiKey;
var apiInUrl = 'http://2captcha.com/in.php';
var apiLookupUrl = 'http://2captcha.com/res.php?action=get';
var apiMethod = 'base64';

var defaultOptions = {
    pollingInterval: 2000,
    retries: 3
};


function pollCaptcha(captchaId, options, invalid, callback) {
    invalid = invalid.bind({options:options,captchaId:captchaId});
    var intervalId = setInterval(function() {
        var httpRequestOptions = url.parse(apiLookupUrl + '&key=' + apiKey + '&id=' + captchaId);
        var request = http.request(httpRequestOptions, function(response) {
            var body = '';

            response.on('data', function(chunk) {
                body += chunk;
            });

            response.on('end', function() {
                if (body === 'CAPCHA_NOT_READY')
                    return;
                clearInterval(intervalId);

                var result = body.split('|');
                if (result[0] !== 'OK') {
                    callback(result[0]); //error
                } else {
                    callback(null, {
                        id: captchaId,
                        text: result[1]
                    }, invalid);
                }
                callback = function() {}; // prevent the callback from being called more than once, if multiple http requests are open at the same time.
            });
        });

        request.end();
    }, (options.pollingInterval || defaultOptions.pollingInterval));
}

module.exports.setApiKey = function(key) {
    apiKey = key;
};

module.exports.decode = function(base64, options, callback) {
    if(!callback){
        callback = options;
        options = defaultOptions;
    }
    var httpRequestOptions = url.parse(apiInUrl);
    httpRequestOptions.method = 'POST';

    var postData = {
        method: apiMethod,
        key: apiKey,
        body: base64
    };

    postData = querystring.stringify(postData);

    var request = http.request(httpRequestOptions, function(response) {
        var body = '';

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            var result = body.split('|');
            if (result[0] !== 'OK')
                callback(result[0]);
            pollCaptcha(result[1], options, function(){
                module.exports.report(this.captchaId);
                if(!this.options.retries)
                    this.options.retries = defaultOptions.retries;
                if(this.options.retries > 1){
                    this.options.retries = this.options.retries - 1;
                    module.exports.decode(base64, this.options, callback);
                }else{
                    callback('Failed too many times');
                }
            }, callback);
        });
    });
    request.write(postData)
    request.end();
};

module.exports.decodeUrl = function(uri, options, callback) {
    if(!callback){
        callback = options;
        options = defaultOptions;
    }
    var protocol = http;
    if (uri.indexOf('https') == 0)
        protocol = https;

    var options = url.parse(uri);

    var request = protocol.request(options, function(response) {
        var body = '';
        response.setEncoding('base64');

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            module.exports.decode(body, options, callback);
        });
    });
    request.end();
};

module.exports.solveRecaptchaFromHtml = function(html, options, callback){
    if(!callback){
        callback = options;
        options = defaultOptions;
    }
    var googleUrl = html.split('/challenge?k=');
    if(googleUrl.length < 2)
        return callback('No captcha found in html');
    googleUrl = googleUrl[1];
    googleUrl = googleUrl.split('"')[0];
    googleUrl = googleUrl.split("'")[0];
    googleUrl = 'https://www.google.com/recaptcha/api/challenge?k='+googleUrl;

    var protocol = http;
    if (googleUrl.indexOf('https') == 0)
        protocol = https;

    var httpRequestOptions = url.parse(googleUrl);

    var request = protocol.request(httpRequestOptions, function(response) {
        var body = '';
        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            var challenge = body.split("'");
            if (!challenge[1])
                return callback('Parsing captcha failed');
            challenge = challenge[1];
            if (challenge.length === 0)
                return callback('Parsing captcha failed');

            module.exports.decodeUrl('https://www.google.com/recaptcha/api/image?c='+challenge,options,function(error, result, invalid){
                result.challenge = challenge;
                callback(error, result, invalid);
            });
        });
    });
    request.end();
};

module.exports.report = function(captchaId){

};