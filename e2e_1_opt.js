import { group, sleep } from 'k6';
import { check } from 'k6';
import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = 'https://quickpizza.grafana.com/'; // Replace with actual base URL of the application


const authenticationRate = new Rate('authentication_rate'); // Custom metric to track the rate of successful authentications
const ordersSuccessful = new Counter('orders_successful'); // Custom metric to count the number of successful orders created

const configsObj=JSON.parse(open('test-configs.json')); // Load test configuration from an external JSON file (not used in the provided code snippet, but can be utilized for dynamic test data)
const userTemplate=JSON.parse(open('users.json')); // Load user data from an external JSON file (not used in the provided code snippet, but can be utilized for dynamic user data during registration)
const PASSWORD = userTemplate.password; // Extract the password from the user template for use in user registration and authentication steps

function getTestConfig()
{
   const testType= __ENV.TEST_TYPE || 'smoke'; // Get the test type from environment variables, defaulting to 'smoke' if not provided
   const config= configsObj[testType];
   console.log(config);

   return config;
}

function randomString(length) { // Generate a random string for unique usernames
   const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
   let result = '';
   for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
   }
   return result;
}
const selectedConfig= getTestConfig();
export const options = { // Define the load test options

   cloud: {
    // Project: Default project
    projectID: 7643094, // Replace with your actual project ID from k6 Cloud
    // Test runs with the same name groups test runs together.
    name: 'Test e2e',
  },

   stages: selectedConfig.stages, // Define the stages of the load test based on the selected configuration from the JSON file
   thresholds: selectedConfig.thresholds // Define the thresholds for the test based on the selected configuration from the JSON file, including custom metrics for authentication rate and successful orders created
      

   }
   export function setup()
   {
      const apiCheck= http.get(`${BASE_URL}/`); // Perform a setup step to warm up the application before the actual test execution begins, ensuring that the application is responsive and ready for the load test
      if(apiCheck.status === 0)
      {
         console.log("Api is unreachable"); // Log an error message if the API is unreachable, providing immediate feedback about connectivity issues
         throw new Error("Api endpoint is not available"); // Throw an error if the API endpoint is not available, preventing the test from running and providing immediate feedback about the issue
      }

      const testConfig = {
         testStartTime: new Date().toISOString() // Record the start time of the test in ISO format for later analysis and reporting
      }
      return testConfig; // Return the test configuration object to be used in the default function during the test execution
   }




export default function (data) { // Simulate user registration

   let userRegistered = false;
   let userAuthenticated = false;
   let orderCreated = false;
   let authToken = null;
   let USERNAME = `rahulshetty ${randomString(7)}1`;

   group('user registration', function () { // Group the user registration steps together for better organization and reporting
      const registerPayload = { // Define the payload for user registration
         username: USERNAME,
         password: PASSWORD
      }

      const params = { // Define the parameters for the HTTP request
         headers: { 'Content-Type': 'application/json' }
      }

      const regresponse = http.post(`${BASE_URL}api/users`, JSON.stringify(registerPayload), params); // Send the HTTP POST request to register the user

      userRegistered = check(regresponse, {
         'response code is 201': (regresponse) => { // Check if the response status code is 201 (Created)
            return regresponse.status === 201
         }
      });

      if (!userRegistered) {
         console.log(`user registration failed ${regresponse.status} - ${regresponse.body}`); // Log an error message if user registration fails

      }
      sleep(1);


   })

   group('login', function () {
      const registerPayload = {
         username: USERNAME,
         password: PASSWORD

      }
      const loginResponse = http.post(`${BASE_URL}api/users/token/login`, JSON.stringify(registerPayload),
         { headers: { 'Content-Type': 'application/json' } }); // Send the HTTP POST request to log in the user

      console.log(`login status=${loginResponse.status} body=${loginResponse.body}`);

      userAuthenticated = check(loginResponse, {
         'status is 200': (res) => res.status === 200, // Check if the response status code is 200 (OK)
         'response contains token': (res) => res.json('token') !== undefined, // Check if the response contains a token
         'token is valid string': (res) => {
            const token = res.json('token')
            return token !== undefined && token.length > 5; // Check if the token is a valid string and longer than 5 characters
         }

      })

      if (userAuthenticated) {
         authenticationRate.add(1); // Increment the custom metric for successful authentications

         authToken = loginResponse.json('token'); // Log the response body if user authentication fails
         console.log(`user authenticated successfully: ${USERNAME}`)
      }
      else {
         authenticationRate.add(0); // Increment the custom metric for failed authentications
         console.log(`user authentication failed: ${loginResponse.status} - ${loginResponse.body}`); // Log an error message if user authentication fails
      }
   })

   group('Order management', function () {
      const params = {
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
         }
      };

      const orderPayLoad = {
         maxCaloriesPerSlice: 1000,
         mustBeVegetarian: true,
         excludedIngredients: [],
         excludedTools: ["Pizza cutter"],
         maxNumberOfToppings: 9,
         minNumberOfToppings: 2,
         customName: "hello"

      }
      const createOrderResponse = http.post(`${BASE_URL}api/pizza`, JSON.stringify(orderPayLoad), params)

      const orderCreated = check(createOrderResponse, {
         'order creation status is 200': (res) => res.status === 200,
         'response contains Id': (res) => res.json('pizza.id') !== undefined,
         'order name is correct': (res) => res.json('pizza.name') === orderPayLoad.customName
      })

      let orderId;
      if (orderCreated) {
         ordersSuccessful.add(1); // Increment the custom metric for successful orders created
         orderId = createOrderResponse.json('pizza.id'); // Log the response body if order creation is successful
         console.log(`order created successfully for user: ${orderId}`);
      }
      else {
         ordersSuccessful.add(0); // Increment the custom metric for failed orders created
         console.log(`order creation failed: ${createOrderResponse.status} - ${createOrderResponse.body}`); // Log an error message if order creation fails
         return; // Exit the function if order creation fails to avoid further steps
      }
      sleep(1);

      // Retrieve the order details using the order ID
      const retrieveOrderResponse = http.get(`${BASE_URL}api/pizza/${orderId}`, params) // Send the HTTP GET request to retrieve the order details
      const orderRetrieved = check(retrieveOrderResponse, {
         'order retrieval status is 200': (res) => res.status === 200,
         'response contains Id': (res) => res.json('id') === orderId,
         'order name is correct': (res) => res.json('name') === orderPayLoad.customName
      })
      if (orderRetrieved) {
         console.log(`order retrieved successfully for user: ${orderId}`) // Log a success message if order retrieval is successful
      }
      else {
         console.log(`order retrieval failed: ${retrieveOrderResponse.status} - ${retrieveOrderResponse.body}`); // Log an error message if order retrieval fails
      }
   })
}

export function teardown(data)
{
   data.testEndTime= new Date().toISOString(); // Record the end time of the test in ISO format for later analysis and reporting
   console.log(`Test started at: ${data.testStartTime} and ended at: ${data.testEndTime}`); // Log the start and end times of the test for better visibility and analysis of test duration
}
