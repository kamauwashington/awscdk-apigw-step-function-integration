# API Gateway Step Function Integration w/ AWS CDK 2.0

> This repository is purely for reference and is illustrative in it is purpose.


This project illustrates using the AWS CDK v2 to create an API Gateway endpoint that posts directly to a Step Function. While this solution can be coded in a single function, the goal here was to show an example of two Lambdas in sequence in a Step Function returning synchronously. Think of having multiple teams using different languages orchestrating a larger solution in a lego block fashion.

This example contains VTL transformation w/ logic as a response.

## Prerequisites

Before continuing, ensure you have met the following requirements:

* AWS CDK CLI 2.8.0 or higher (or use npx)
* an AWS profile configured in **~/.aws/config** and **~/.aws/credentials**
    * there are instructions to set up an Access Key Credential Type [here](https://cdkworkshop.com/15-prerequisites/200-account.html).

## Installation

* clone this repository into a directory of your choosing
* run **npm install** in that directory 

## Deployment

This project does not use the standard environment in code solution seen often and opts for AWS profiles instead.

* run **cdk deploy --profile \<your profile name\>** if you have defined a non default profile in the **~/.aws** files
* run **cdk deploy** if you have defined a default profile, or have AWS environment variables set 

## Verifying Deployment

Assuming everything runs smoothly during stack deployment, it is fairly easy to verify that the solution is working. Upon 
the deployment finishing, the URI of the endpoint will be displayed in the console.

* Use postman, curl, VSCode or other tooling to POST the following JSON to that endpoint

```Javascript
{
    "lat" : 33.8337,
    "lon" : -84.1450
}
```

* The response returned should be a 500 error if the coordinates are invalid lat/lon values or 200 

### 500 Response
```Javascript
{
    "_RequestId": "e18c0fe9-be54-4eca-80d4-a810862c37fd",
    "error": "Longitude must be between -180 and 180."
}
```
### 200 Response
```Javascript
{
    "_RequestId": "58e51deb-90f9-4061-a13a-7819341922d8",
    "data": {
        "code": "ATL",
        "lat": "33.6558",
        "lon": "-84.4333",
        "name": "Hartsfield-Jackson Atlanta International Airport",
        "city": "Atlanta",
        "state": "Georgia",
        "country": "United States",
        "woeid": "12522118",
        "tz": "America/New_York",
        "phone": "(654) 57 8833",
        "type": "Airports",
        "email": "",
        "url": "http://www.atlanta-airport.com/",
        "runway_length": "11889",
        "elev": "1026",
        "icao": "KATL",
        "direct_flights": "253",
        "carriers": "60"
    }
}
```

## Notes

* This repository is heavily commented to provide context as to what and why, if in VS Code feel free to collapse all comments if they are obtrusive
    * On Mac -> Press <kbd>&#8984;</kbd> + <kbd>K</kbd> then <kbd>&#8984;</kbd> + <kbd>/</kbd> 
    * On Windows & Linux -> Press <kbd>Ctrl</kbd> + <kbd>K</kbd> then <kbd>Ctrl</kbd> + <kbd>/</kbd> 
