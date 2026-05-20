import { group, sleep } from 'k6';
import { check } from 'k6';
import http from 'k6/http';

const BASE_URL = 'http://quickpizza.grafana.com/'; // Replace with actual base URL of the application

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

   vus: 1,
   duration: '5s'


}

export default function () { // Simulate user registration

   let userRegistered = false; 
   let userAuthenticated = false;
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
            return regresponse.status === 200
         }
      });

      if (!userRegistered) {
         console.error(`user registration failed ${regresponse.status} - ${regresponse.body}`); // Log an error message if user registration fails

      }
      sleep(1);


   })

   group('login', function () {
      const registerPayload = {
         
         password: PASSWORD

      }
      const loginResponse = http.post(`${BASE_URL}api/login`, JSON.stringify(registerPayload),
         { headers: { 'Content-Type': 'application/json' } }); // Send the HTTP POST request to log in the user

      userAuthenticated = check(loginResponse, {
         'status is 200': (res) => res.status === 200, // Check if the response status code is 200 (OK)
         'response contains token': (res) => res.json('token') !== undefined, // Check if the response contains a token
         'token is valid string': (res) => res.json('token').length > 5 // Check if the token length is greater than 10 characters



      })

      if (!userAuthenticated) {

         authToken = loginResponse.json('token'); // Log the response body if user authentication fails
         console.log(`user authenticated successfully: ${USERNAME}`)
      }
      else {
         console.log(`user authentication failed: ${regresponse.status} - ${regresponse.body}`); // Log an error message if user authentication fails
      }
   })
}
