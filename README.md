# webapp

Overview

This Health Check API assignment aims to monitor the health of our service by implementing a RESTful /healthz endpoint. The purpose of this assignment is to detect whether the running application instance can handle incoming requests.

Operations Performed By /healthz Endpoint

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