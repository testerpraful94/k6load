import { sleep, check } from 'k6';
import http from 'k6/http'
import { Trend } from 'k6/metrics';

//Trend: Increasing load with multiple stages and comprehensive thresholds for performance and reliability

const pizzaResponseTime = new Trend('pizza_response_time'); //custom metric to track response time of pizza endpoint
const pizzaRequestTime = new Trend('pizza_request_time');
export const options = {

    stages: [
        { duration: '3s', target: 2 }, // ramp up to 2 users over 3 seconds
        { duration: '5s', target: 4 }, // ramp up to 4 users over 5 seconds
        { duration: '4s', target: 0 }  // ramp down to 0 users over 4 seconds
    ],


    thresholds: { //define thresholds for performance and reliability
        'http_req_duration': ['p(95) < 500'], //95% of requests must complete in under 500ms
        'http_req_failed': ['rate < 0.01'], //failure rate must be less than 1%
        'checks': ['rate>0.9'], //more than 90% of checks must pass
        'http_req_duration{name: api}': ['p(95) < 150'], //for requests tagged with 'api', 95% must be under 300ms
        'http_req_failed{name: api}': ['rate <0.1'], //for requests tagged with 'api', failure rate must be less than 10%
        'pizza_response_time': ['p(95) < 200'],
        'pizza_request_time': ['p(95) <200']
    }

}
export default function () {
    const response = http.get("https://quickpizza.grafana.com/");

    pizzaResponseTime.add(response.timings.waiting); //add the waiting time of the response to our custom metric
    pizzaRequestTime.add(response.timings.sending); //add the sending time of the request to our custom metric

    check(response, {
        'is status 200': (r) => r.status === 200, //check if status is 200
        'page contains pizza': (r) => r.body.includes('pizza') //check if response body contains 'pizza'
    })

    http.get("https://quickpizza.grafana.com/menu/api/pizzas", {
        tags: { name: 'api'} //add a tag to this request for better reporting
    });
    sleep(1);
}