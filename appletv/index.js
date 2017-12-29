'use strict';

var QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/640880974568/appletv';
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({region : 'us-east-1'});

exports.handler = function (request, context) {
    if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
        log("DEBUG:", "Discover request",  JSON.stringify(request));
        handleDiscovery(request, context, "");
    }
    else if (request.directive.header.namespace === 'Alexa.PowerController') {
        if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
            log("DEBUG:", "TurnOn or TurnOff Request", JSON.stringify(request));
            handlePowerControl(request, context);
        }
    }
    else if (request.directive.header.namespace === 'Alexa.PlaybackController') {
        if (request.directive.header.name === 'Play' || request.directive.header.name === 'Pause' || request.directive.header.name === 'Stop') {
            log("DEBUG:", "Playback Request", JSON.stringify(request));
            handlePlayback(request, context);
        }
    }

    function queueEvent(event, response) {
        var params = {
          MessageBody: JSON.stringify(event),
          QueueUrl: QUEUE_URL
        };
        let result = sqs.sendMessage(params, function(err, data){
          log("DEBUG", " Response ", JSON.stringify(response));
          if (err) {
            log('DEBUG', 'error:', "Fail Send Message" + err);
            context.done('error', 'ERROR with SQS')
          } else {
            log('DEBUG', 'data:', data.MessageId);
            context.succeed(response);
          }
        });
    }

    function handleDiscovery(request, context) {
        var payload = {
            "endpoints":
            [
                {
                    "endpointId": "totally-unique-id",
                    "manufacturerName": "Apple",
                    "friendlyName": "TV",
                    "description": "Apple TV",
                    "displayCategories": ["TV"],
                    "cookie": {
                    },
                    "capabilities":
                    [
                        {
                          "type": "AlexaInterface",
                          "interface": "Alexa",
                          "version": "3"
                        },
                        {
                            "interface": "Alexa.PowerController",
                            "version": "3",
                            "type": "AlexaInterface",
                            "properties": {
                                "supported": [{
                                    "name": "powerState"
                                }],
                                 "retrievable": false
                            }
                        },
                        {
                          "type": "AlexaInterface",
                          "interface": "Alexa.PlaybackController",
                          "version": "3",
                          "supportedOperations" : ["Play", "Pause", "Stop"]
                        }
                    ]
                }
            ]
        };
        var header = request.directive.header;
        header.name = "Discover.Response";
        log("DEBUG", "Discovery Response: ", JSON.stringify({ header: header, payload: payload }));
        context.succeed({ event: { header: header, payload: payload } });
    }

    function log(message, message1, message2) {
        console.log(message + " " + message1 + " " + message2);
    }

    function generatePowerResponse(request, powerResult) {
        var contextResult = {
            "properties": [{
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": powerResult,
                "timeOfSample": new Date().toJSON(),
                "uncertaintyInMilliseconds": 50
            }]
        };
        var responseHeader = request.directive.header;
        responseHeader.namespace = "Alexa";
        responseHeader.name = "Response";
        responseHeader.messageId = responseHeader.messageId + "-R";
        var response = {
            context: contextResult,
            event: {
                header: responseHeader,
                payload: {}
            },
        };
        return response;
    }

    function handlePowerControl(request, context) {
        // get device ID passed in during discovery
        var requestMethod = request.directive.header.name;
        
        if (requestMethod === "TurnOn") {
            queueEvent({action: "on"}, generatePowerResponse(request, "ON"));
        }
       else if (requestMethod === "TurnOff") {
            queueEvent({action: "off"}, generatePowerResponse(request, "OFF"));
        }
    }

    function generatePlaybackResponse(request) {
        var contextResult = {
            "properties": []
        };
        var responseHeader = request.directive.header;
        responseHeader.namespace = "Alexa";
        responseHeader.name = "Response";
        responseHeader.messageId = responseHeader.messageId + "-R";
        var response = {
            context: contextResult,
            event: {
                header: responseHeader,
                payload: {}
            },
        };
        return response;
    }

    function handlePlayback(request, context) {
        // get device ID passed in during discovery
        var requestMethod = request.directive.header.name;

        if (requestMethod === "Play") {
            queueEvent({action: "play"}, generatePlaybackResponse(request));
        }
        else if (requestMethod === "Pause") {
            queueEvent({action: "pause"}, generatePlaybackResponse(request));
        }
        else if (requestMethod === "Stop") {
            queueEvent({action: "stop"}, generatePlaybackResponse(request));
        }
    }
};
