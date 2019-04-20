/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');

const FEATURED_TOUR = '1ov5eg7w';

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

        let tourname = data.tourname;
        let firstname = data.stravaAuth.athlete.firstname;
        let lastname = data.stravaAuth.athlete.lastname;

        outputSpeech = `Welcome to the tourbook Alexa skill. Today's featured tour is ${tourname} by ${firstname}. You can ask, where is ${firstname}.`;

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
    let totalDistance = 0;
    let outputSpeech = 'I wasn\'t able to find the location';

    await getRemoteData(`https://0pkswkftik.execute-api.us-east-1.amazonaws.com/dev/collections/${FEATURED_TOUR}`)
      .then((response) => {
        const data = JSON.parse(response);

        //Get Last Location
        if(data.stravaCache){
          lat_lng = data.stravaCache[data.stravaCache.length - 1].end_latlng;

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
        outputSpeech = `Tomás last made camp at ${location}. He has traveled ${totalDistance} miles.`;

        console.log(outputSpeech);

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

