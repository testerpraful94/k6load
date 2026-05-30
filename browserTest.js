import { check } from 'k6';
import {browser} from 'k6/browser';
import http from 'k6/http';


export const options = {

    scenarios : {
        ui : {

            executor : 'shared-iterations', // Use the shared-iterations executor, which allows multiple virtual users (VUs) to share a fixed number of iterations. This is useful for simulating a realistic load on the application while ensuring that the total number of iterations is controlled.
            exec : 'browserTest', // Specify the function to execute for this scenario, which is the browserTest function defined below. This function will contain the steps to perform the UI interactions and validations.
            vus : 2, // Set the number of virtual users (VUs) to simulate for this scenario. In this case, 10 VUs will be used to perform the browser interactions concurrently.
            maxduration : '1m', // Set the duration for which this scenario will run. In this case, the scenario will run for 1 minute, allowing the VUs to perform the defined interactions and validations during that time frame.
            iterations : 4, // Set the number of times this scenario will run. In this case, the scenario will run 4 times.
            options : {
                browser : {
                    type: 'chromium', // Specify the type of browser to use for UI testing.
                    headless: false // Set headless to false to run the browser in non-headless mode, allowing you to see the browser interactions during the test execution. This is useful for debugging and visual verification of the test steps.
                },
            },
                

        },

        backendTest : {
            executor : 'constant-vus', // Use the constant-vus executor, which maintains a constant number of virtual users (VUs) for a specified duration. This is useful for testing the backend API under a steady load.
            exec : 'backendTest', // Specify the function to execute for this scenario, which is the backendTest function (not defined in the provided code snippet). This function would contain steps to test the backend API or services of the application.

            vus : 10,
            duration : '1m'
        }



    },
    thresholds : {
        checks : ['rate==1.0'] // Set a threshold for the checks metric, requiring that all checks must pass (100% success rate) for the test to be considered successful. This ensures that all assertions defined in the check functions must be true for the test to meet the performance criteria.
            }
    

    }
    





//async - all browser interactions are asynchronous,so we need to use async/await to handle them properly
export async function browserTest() 
{
    const context = await browser.newContext(); // Create a new browser context. A context is like an isolated browser session, allowing you to run multiple tests in parallel without interference. eg: incognito mode in Chrome
    const page = await context.newPage(); // Open a new page in the browser. This page will be used to navigate to the application and perform actions like clicking buttons, filling forms, etc.
    const browserURL = await page.goto("https://rahulshettyacademy.com/locatorspractice/"); // Navigate to the specified URL. This is the starting point of the test where the browser will load the application under test.
    const usernameInput = await page.locator("#inputUsername").type("rahul"); // Locate the username input field using its CSS selector and type the specified username into it.
    console.log('Filling password...');
    const passwordInput = await page.locator("input[name='inputPassword']").type("rahulshettyacademy"); // Locate the password input field using its CSS selector and type the specified password into it.
    console.log('Clicking sign-in button...');
    const signInButton = await page.locator(".signInBtn").click(); // Locate the sign-in button using its CSS selector and click it to submit the login form.
    console.log('Navigating to the dashboard...');

    await page.waitForTimeout(2000); // Wait for 2 seconds to allow the page to load after clicking the sign-in button. This is necessary to ensure that the next steps are performed on the correct page.
    const headerText = await page.locator("h1").getByText("Welcome to Rahul Shetty Academy").first().textContent(); // Locate the first <h1> element on the page and retrieve its text content. This is typically used to verify that the user has successfully logged in and is on the dashboard page, which should contain a welcome message or header indicating a successful login.

    check(headerText, {
        'Header text is correct': (text) =>
        {
            return text.includes('Rahul Shetty Academy'); // Check if the header text includes the expected welcome message, indicating a successful login and navigation to the dashboard.
        }

        
    })

    await page.close(); // Close the browser page after the test is completed to free up resources.


}
export async function backendTest(){
     const response = http.get("https://rahulshettyacademy.com/locatorspractice/");

     check(response, {
        // No need to give return statement  when we dont have curly braces, as it is an implicit return in arrow functions.
        'status is 200' : (response) => response.status === 200 // Check if the response status code is 200 (OK), indicating that the backend API is responding correctly.
        
     })
    

}