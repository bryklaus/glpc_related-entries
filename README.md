# OJS Related Entries
Related Entries Docker app for OJS 3.x

## Microservice
A nodejs microservice stores submission-submission relationships in a mysql database.

To install, see the required configuration variables in the `app/env.template` file.  Within the app directory, create a `.env` and then launch the application via the `docker-compose.yml` (e.g. `docker compose up -d`).  The `docker-compose.yml` will expose a single HTTP endpoint.  Presumably, you will want to proxy the application though Apache or nginx or similar to expose the NodeJS server over HTTP/HTTPS.

## Javascript UI
Javascript files enable a backend UI for interaction with the microservice, and enable a public UI to render the relationships on the article landing page.

To implement in OJS, include the `js/crossRefBlock.js` javascript file in the frontend, and the `js/relatedEntries.js` plugin in the backend (e.g., using the Custom Header Plugin).

Editorial users who wish to populate the cross references must enable an OJS API key in their OJS user profile.  This API key will be passed to the microservice to validate the user's authorization.

To populate the cross references, navigate to the Submission in the workflow and use the "Cross Refereces" widget which appears as an overlay.

## A pilot project
This functionality demonstrates the value of a [generalized solution to interlink submissions in PKP OJS/OPS/OMP](https://forum.pkp.sfu.ca/t/interlinking-submissions-preprints-reviews-related-submissions/73783), with the hope that further development may be done to enable this as a built-in feature.
