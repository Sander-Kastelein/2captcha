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


function pollCaptcha(captchaId, pollingInterval, callback) {
    var intervalId = setInterval(function() {
        var options = url.parse(apiLookupUrl + '&key=' + apiKey + '&id=' + captchaId);
        var request = http.request(options, function(response) {
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
                    });
                }
                callback = function() {}; // prevent the callback from being called more than once, if multiple http requests are open at the same time.
            });
        });

        request.end();
    }, pollingInterval);
}

module.exports.setApiKey = function(key) {
    apiKey = key;
};

module.exports.decode = function(base64, pollingInterval, callback) {
    var options = url.parse(apiInUrl);
    options.method = 'POST';

    var postData = {
        method: apiMethod,
        key: apiKey,
        body: base64
    };

    postData = querystring.stringify(postData);

    var request = http.request(options, function(response) {
        var body = '';

        response.on('data', function(chunk) {
            body += chunk;
        });

        response.on('end', function() {
            var result = body.split('|');
            if (result[0] !== 'OK')
                callback(result[0]);
            pollCaptcha(result[1], pollingInterval, callback);
        });
    });
    request.write(postData)
    request.end();
};

module.exports.decodeUrl = function(uri, pollingInterval, callback) {
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
            module.exports.decode(body, pollingInterval, callback);
        });
    });
    request.end();
};