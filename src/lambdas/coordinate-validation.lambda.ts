import { IError } from '../models/error.interface';
import { IGeo } from '../models/geo.interface';


/**
 * This function serves as a validation Lambda for the IGeo interface. While the interface
 * is simple enough to validate via JSON Schema at the APIGW, this State Machine Step is illustrative for designs
 * where JSON schema alone can't perform validation (think unique array items).
 * 
 * This can easily be a shared function across Lambdas if necessary, and would be more performant.
 * This is simply to show the State Machine with multiple steps moving from one to the next.
 */
export const handler = async function (event: IGeo) : Promise<IGeo | IError> {
  const promise = new Promise<IGeo>((resolve, reject) => {
    if (event.lat == null || event.lon == null) {
      reject("Both latitude and longitude must be supplied.")
    }
    else if (event.lat < -90 || event.lat > 90) {
      reject("Latitude must be between -90 and 90.")
    }
    else if (event.lon < -180 || event.lon > 180) {
      reject("Longitude must be between -180 and 180.")
    }
    else {
      resolve(event);
    }
  })
  promise.then(function (result) : IGeo {
    return result;
  });
  promise.catch(function (error) :IError {
    return {
      message: error
    };
  })
  return promise;
}
