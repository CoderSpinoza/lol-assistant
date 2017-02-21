'use strict';

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();
var sessionAttributes = {};

var docClient = new AWS.DynamoDB.DocumentClient();

var params = {
    TableName : "Game",
    KeyConditionExpression: "#user = :user",
    ExpressionAttributeNames:{
        "#user": "Summoner"
    },
    ExpressionAttributeValues: {
        ":user": "killerspinoza"
    }
};
// --------------- Helpers that build all of the responses -----------------------
var riotUrl = "https://kr.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/KR/killerspinoza?api_key=RGAPI-b6956daa-9775-45e1-a22d-af4fa52993f2";

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to Lol Assitant. ';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me if you see any champion using his skill';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying LOL Assitant. Call me again if you play a new game';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


function startGame(intent, session, callback) {
  let shouldEndSession = true;
  let speechOutput = 'Starting tracking a new League of Legdends game';
  let repromptText = 'Please tell me if you see any champion using his skill';

  const params = {
    TableName: "Game",
    Item: {
      summoner: "killerspinoza",
      createdTime: new Date().getTime(),
    }
  };

  docClient.put(params, function(err, data) {
    if (err) {
      console.log(err);
    }
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
  });

}

function endGame(intent, session, callback) {
  let shouldEndSession = true;
  let speechOutput = 'Ending tracking a league of legends game';
  // let repromptText = 'Do you want me to end tracking the game?';

  var params = {
    TableName : "Game",
    Key: {
      summoner: "killerspinoza"
    },
    UpdateExpression: "set isPlaying = :false",
    ExpressionAttributeValues: {
      ":false": false
    }
  };

  console.log(params);
  docClient.update(params, function(err, data) {
    if (err) {
      console.log(err);
    }
  });
  callback(sessionAttributes,
       buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function updateCoolTime(intent, session, callback) {
  const champ = intent.slots.Champion;
  const skill = intent.slots.Skill;
  let shouldEndSession = false;
  let speechOutput = '';
  // let repromptText = "Please tell me if you see any champion using his skill";

  let repromptText = null;
  if (champ && skill) {
    const params = {
      TableName: "Game",
      Key: {
        summoner: "killerspinoza"
      }
    };

    docClient.get(params, function(err, data) {
      if (err) {
        console.log(err);
      }
      if (data.length === 0) {
        console.log("no current game");
      }
      var game = data.Item;
      var updatedSkills = game[champ.value] || {};
      console.log(updatedSkills);
      updatedSkills[skill.value] = new Date().getTime();
      // updatedSkills = Object.assign({}, updatedSkills, {skill.value: new Date().getTime()});
      // sessionAttributes = Object.assign({}, sessionAttributes, { champ.value: updatedSkills});
      game[champ.value] = updatedSkills;
      // sessionAttributes[champ.value][skill.value] = new Date().getTime();
      speechOutput = `${champ.value} just used ${skill.value}.`;

      console.log(game);
      const putParams = {
        TableName: "Game",
        Item: game
      };
      docClient.put(putParams, function(err, data) {
        if (err) {
          console.log(err);
        }
        callback(sessionAttributes,
             buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
      })
    });

  } else {
    speechOutput = "I am not sure what your champion or skill is.";
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
  }

}

function getCoolTime(intent, session, callback) {
  const champ = intent.slots.Champion;
  const skill = intent.slots.Skill;

  let shouldEndSession = false;
  let speechOutput = '';
  let repromptText = null;

  if (champ && skill) {

    const params = {
      TableName: "Game",
      Key: {
        summoner: "killerspinoza"
      }
    };
    docClient.get(params, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        var game = data.Item;
        var updatedSkills = game[champ.value] || {};

        if (updatedSkills[skill.value]) {
          var time = updatedSkills[skill.value];
          var elapsedTime = (new Date().getTime() - time) / 1000;
          speechOutput = `${champ.value} used ${skill.value} ${elapsedTime} seconds ago.`;
        } else {
          speechOutput = `${champ.value} haven't used ${skill.value} before.`;
        }
      }
      callback(sessionAttributes,
        buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });
  } else {
    speechOutput = "I am not sure what your champion or skill is.";
    callback(sessionAttributes,
      buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
  }
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else if (intentName === 'StartGame') {
      startGame(intent, session, callback);
    } else if (intentName === 'EndGame') {
      endGame(intent, session , callback);
    } else if (intentName === 'PostSkillCoolTime') {
      updateCoolTime(intent, session, callback);
    } else if (intentName === 'GetSkillCoolTime') {
      getCoolTime(intent, session, callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
