import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as path from 'path';
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * This stack could be broken down into constructs in separate files, however it is easier to follow in
 * a procedural fashion prior to deconstruction. (this sounds Punny)
 */
export class ApigwStepFunctionsCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const servicePrefix: string = "ApigwStepFunctionsCdk";

    /**
     * Create the Coordinate Validation Lambda with 1 sec timeout as it's sole purpose
     * is to perform simple validation
     */
    const coordinateValidationFunction = new NodejsFunction(
      this,
      "Coordinate Validation",
      {
        functionName: `${servicePrefix}-CoordinateValidationFunction`,
        memorySize: 128,
        timeout: Duration.seconds(1),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../src/lambdas/coordinate-validation.lambda.ts"
        ),
      }
    );

    /**
     * Create the Nearest Airport Lookup Lambda in this example we will be loading
     * the airports JSON into memory. Ideally inspecting the memory usage would be a better gauge
     * for the memory size of the Lambda.
     */
    const nearestAirportLookupFunction = new NodejsFunction(
      this,
      "Nearest Airport Lookup",
      {
        functionName: `${servicePrefix}-NearestAirportLookupFunction`,
        memorySize: 128,
        timeout: Duration.seconds(2),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "handler",
        entry: path.join(
          __dirname,
          "../src/lambdas/nearest-airport-lookup.lambda.ts"
        ),
      }
    );

    /**
     * Create the State Machine Definition placing the two step functions in sequence. *Note the
     * use of $.Payload, which is the output of the function (as there is other data returned when a
     * Lambda is invoked)
     */
    const machineDefinition = new tasks.LambdaInvoke(
      this,
      "Step : Coordinate Validation",
      {
        lambdaFunction: coordinateValidationFunction,
        outputPath: "$.Payload",
        retryOnServiceExceptions: false,
      }
    ).next(
      new tasks.LambdaInvoke(this, "Step : Nearest Airport Lookup", {
        lambdaFunction: nearestAirportLookupFunction,
        outputPath: "$.Payload",
        retryOnServiceExceptions: false,
      })
    );

    /**
     * Create the State Machine given the definitions and set the Type to EXPRESS, as we will be executing
     * this State Machine synchronously to receive the result immediately after execution vs polling for a
     * State Machine Response.
     *
     * https://aws.amazon.com/blogs/compute/new-synchronous-express-workflows-for-aws-step-functions/
     */
    const stateMachine = new sfn.StateMachine(this, "State Machine", {
      definition: machineDefinition,
      timeout: Duration.seconds(4),
      stateMachineName: `${servicePrefix}-StateMachine`,
      stateMachineType: sfn.StateMachineType.EXPRESS,
    });

    /**
     * Create the policy statement that allows synchoronous execution of the Step Function
     */
    const policyStatement = new iam.PolicyStatement({
      /**
       * A full list of StepFunction actions can be found here :
       * https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsstepfunctions.html
       */
      actions: ["states:StartSyncExecution"],
      effect: iam.Effect.ALLOW,
      resources: [stateMachine.stateMachineArn],
    });

    /**
     * Create a policy to house the policy statements above.
     */
    const policy = new iam.Policy(this, "Start Sync Execution Policy", {
      statements: [policyStatement],
      policyName: `${servicePrefix}-StartSyncExecutionRole`,
    });

    /**
     * Create an execution role to be assumed by API Gateway.
     */
    const role = new iam.Role(this, "Execution Role", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      roleName: `${servicePrefix}-ExecutionRole`,
    });

    /**
     * Attach the StartSyncExecution Policy to the API Gateway Exeuction role.
     */
    role.attachInlinePolicy(policy);

    /**
     * Create the API in ApiGateway
     */
    const restApi = new apigw.RestApi(this, "API Endpoint", {
      deployOptions: {
        stageName: "sandbox",
      },
      restApiName: `${servicePrefix}-Api`,
    });

    /**
     * Prepare a response template in VTL to handle Success / Error states, and light transformation
     * https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
     */
    const responseTemplate: string = `
      #set ($response = $util.parseJson($input.body))
      #set ($requestId = $response.name)

      #if ($response.status == "SUCCEEDED")
          {
            "_RequestId" : "$requestId",
            "data" : $response.output
          }
      #elseif ($response.status == "FAILED")
          #set ($cause = $util.parseJson($response.cause))
          #set($context.responseOverride.status = 500)
          {
              "_RequestId" : "$requestId",
              "error": "$cause.errorMessage"
          }
      #else
          #set($context.responseOverride.status = 500)
          $input.body
      #end
    `;

    /**
     * Add the Step Function inegration to the root path POST method, ensuring that the API Gateway
     * has an authorized execution role, and providing transfomations for integration input and output.
     */
    restApi.root.addMethod(
      "POST",
      new apigw.AwsIntegration({
        service: "states",
        action: "StartSyncExecution",
        integrationHttpMethod: "POST",
        options: {
          credentialsRole: role,
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": responseTemplate,
              },
            },
          ],
          requestTemplates: {
            // https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html#API_StartExecution_RequestSyntax
            "application/json": `
            {
                "input": "$util.escapeJavaScript($input.body)",
                "stateMachineArn": "${stateMachine.stateMachineArn}"
            }
            `,
          },
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );
  }
}
