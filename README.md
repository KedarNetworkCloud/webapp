# webapp

Overview

This Health Check API assignment aims to monitor the health of our service by implementing a RESTful /healthz endpoint. The purpose of this assignment is to detect whether the running application instance can handle incoming requests.

Operations Performed By /healthz

1. Database Connection:

Confirm if the application can connect to the database.
If the connection is successful, the API will return HTTP 200 (OK).
If the connection fails, the API will return HTTP 503 (Service Unavailable).

2. Cache-Control:
Adding 'no-cache' header to ensure that health check responses are not cached.

3. No Payload Allowed:
If a request to our /healthz API includes any payload, the API will return HTTP 400 (Bad Request).

4. Supported HTTP Methods:
Only HTTP GET method is allowed for the /healthz endpoint. Any other methods will result in an error (405 Method Not Allowed).

Assignment 02

In this Assignment, we have added 2 new RESTFUL API endpoints supporting GET, PUT, POST HTTP Methods

1. POST Request [v1/user]
This REST API supporting POST HTTP Request on v1/user path allows us to create new Users in our 
POSTGRES Database. For a valid POST request, we need to provide required fields such as First_name, Last_name, email and Password. If a User already exists in our POSTGRES Database with the same email ID we return HTTP STtus code 400. There are 2 additional fields in our database called account_created and account_updated which get updated automatically. If a User tries to add these fields in POST request we ignore it. If a POST request has any extra fields other than these 6 fields we return HTTP status code 400. For a valid POST request we create a User in the DB and hash the password using brypt and salt = 10.

2. GET Request [v1/user/self]
This REST API supporting GET HTTP Request on v1/user path allows us to retrieve specific user information from database using Basic Auth token containing information such as email address and password. For an authenticated GET request, we retrieve and display all the user information such as first_name, last_name, email, account_created and account_updated. We do not retrieve and display sensitive information such as the User password. For an unauthorized GET request meaning incorrect emai address or password for a specific user, we display HHTP Status code 401 "Unauthorized".

2. PUT Request [v1/user/self]
This REST API supporting PUT HTTP Request on v1/user/self path allows us to update specific user information from database using Basic Auth token containing information such as email address and password. For an authenticated PUT request, we only update fields such as first_name, last_name and password. If a PUT HTTP Method has any other fields other than these fields we send HTTP Status code 400 Bad request response. For an unauthenticated PUT request we return HTTP Status code 401 "Unauthorized". For every valid and authenticated PUT request we keep updating the specific user's account_updated time field with the relevant value.


CI-CD Workflow using Github Actions

Checking Integration Tests

Assignment 04 - Checking AMI Sharing from DEV to DEMO - Checking Before submission
