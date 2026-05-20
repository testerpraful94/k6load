import { group, sleep } from 'k6';
import { check } from 'k6';
import http from 'k6/http';

const BASE_URL = 'https://quickpizza.grafana.com/'; // Replace with actual base URL of the application

const PASSWORD = 'securepassword123';

function randomString(length) { // Generate a random string for unique usernames
   const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
   let result = '';
   for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
   }
   return result;
}
export const options = { // Define the load test options

   stages: [
      { duration: '5s', target: 2 },
      { duration: '5s', target: 4 },
      { duration: '3s', target: 0 }

   ],
   thresholds: {
      'http_req_duration': ['p(95)<400'],
      'checks': ['rate>0.90'],
      'iteration_duration': ['p(95)<400'],
      'group_duration{group:::Order management}': ['p(95)<800']


   }


}

export default function () { // Simulate user registration

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

         authToken = loginResponse.json('token'); // Log the response body if user authentication fails
         console.log(`user authenticated successfully: ${USERNAME}`)
      }
      else {
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
         orderId = createOrderResponse.json('pizza.id'); // Log the response body if order creation is successful
         console.log(`order created successfully for user: ${orderId}`);
      }
      else {
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
