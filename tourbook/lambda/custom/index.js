/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');

const FEATURED_TOUR = 'xxzvqal1';

const GMAPS_API_KEY = 'AIzaSyDQfyktHRYDFOjvororihtZSzybkrmn7ho';
const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json'

const GetRemoteDataHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
      || (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetRemoteDataIntent');
  },
  async handle(handlerInput) {
    let outputSpeech = 'This is the default message.';

    await getRemoteData(`https://0pkswkftik.execute-api.us-east-1.amazonaws.com/dev/collections/${FEATURED_TOUR}`)
      .then((response) => {
        const data = JSON.parse(response);

        console.log(timeSince)

        let tourname = data.tourname;
        let firstname = data.stravaAuth.athlete.firstname;
        let lastname = data.stravaAuth.athlete.lastname;

        outputSpeech = `Welcome to the tourbook Alexa skill. Today's featured tour is ${tourname} by ${firstname}. You can ask, where are they?`;

      })
      .catch((err) => {
        //set an optional error message here
        outputSpeech = err.message;
      });

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .reprompt(outputSpeech)
      .getResponse();

  },
};

const GetLocationHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetLocationIntent');
  },
  async handle(handlerInput) {

    let lat_lng;
    let firstname;
    let totalDistance = 0;
    let startTime;
    let tourStartDate;
    let timeSinceActivityString;
    let timeSinceTourStartString;
    let outputSpeech = 'I wasn\'t able to find the location';

    await getRemoteData(`https://0pkswkftik.execute-api.us-east-1.amazonaws.com/dev/collections/${FEATURED_TOUR}`)
      .then((response) => {
        const data = JSON.parse(response);

        //Get Last Location
        if(data.stravaCache){

          let lastActivity = data.stravaCache[data.stravaCache.length - 1];
          let firstActivity = data.stravaCache[0];
          firstname = data.stravaAuth.athlete.firstname;
          lat_lng = lastActivity.end_latlng;
          startTime = new Date(lastActivity.start_date);
          tourStartDate = new Date(firstActivity.start_date);
          timeSinceActivityString = timeSince(startTime);
          timeSinceTourStartString = timeSince( tourStartDate );

          //Calc total distance
          data.stravaCache.forEach( (item, i) => {
            totalDistance += item.distance;
          });

          totalDistance = Math.round((totalDistance * 0.000621371)); //Convert to miles
        }

      })
      .catch((err) => {
        //set an optional error message here
        outputSpeech = err.message;
      });

    //Get Geo Data
    await getRemoteData(`${GEOCODE_ENDPOINT}?latlng=${lat_lng[0]},${lat_lng[1]}&key=${GMAPS_API_KEY}&result_type=political`)
      .then((response) => {
        const geodata = JSON.parse(response);
        
        let location = geodata.results[0].formatted_address;
        outputSpeech = `${firstname} last made camp at ${location}, ${timeSinceActivityString} ago. They have traveled ${totalDistance} miles since the tour began ${timeSinceTourStartString} ago.`;

      })
      .catch((err) => {
        //set an optional error message here
        outputSpeech = err.message;
      });

    return handlerInput.responseBuilder
      .speak(outputSpeech)
      .getResponse();

  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can introduce yourself by telling me your name';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetRemoteDataHandler,
    GetLocationHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

// HTTP Request 
const getRemoteData = function (url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed with status code: ' + response.statusCode));
      }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err))
  })
};

// TimeSince
const timeSince = ( date ) => {
  // doesn't change or get reassigned, so use const
  const seconds = Math.floor( ( new Date() - date ) / 1000 );
  // block level var that changes based on conditions, use let
  let interval = Math.floor( seconds / 31536000 );

  if (interval > 1) {
    return `${interval} years`; // you can use string/template literals to make string concat cleaner and easier
  }
  interval = Math.floor( seconds / 2592000 );
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor( seconds / 86400 );
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor( seconds / 3600 );
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor( seconds / 60 );
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}