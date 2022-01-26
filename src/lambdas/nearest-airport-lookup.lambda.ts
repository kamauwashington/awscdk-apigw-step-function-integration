import { airports } from "../data/airports";
import { haversine } from "../functions/haversine.function";
import { IGeo } from "../models/geo.interface";


/**
 * This function serves as the Lambda to find the nearest airport in the airports.json
 * using the haversine function. This implementation is not coded for performance as it is 0(n).
 * It is for illustrative purposes only.
 * 
 * A more performant and flexible solution here would be to use DynamoDB and GeoHashing
 * https://aws.amazon.com/blogs/compute/implementing-geohashing-at-scale-in-serverless-web-applications/
 */
export const handler = async function(event: IGeo) : Promise<any> {

  const airport : any = airports.reduce((previous : any, current: any) => {

    const previousDistance: number = haversine(
      event.lat,
      event.lon,
      parseFloat(previous.lat),
      parseFloat(previous.lon)
    );
    const currentDistance: number = haversine(
      event.lat,
      event.lon,
      parseFloat(current.lat),
      parseFloat(current.lon)
    );
    return previousDistance < currentDistance ? previous : current;
  });

  return airport;
}
