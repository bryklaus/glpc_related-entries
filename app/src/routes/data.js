// Handle API requests to the OJS API

const express = require('express');
const router = express.Router();
const https = require('https');
const fetch = require('node-fetch');
const apiUrl = process.env.OJS_PROTOCOL_AND_DNS + process.env.OJS_BASE_URI + '/api/v1;
const apiKey = process.env.OJS_API_KEY;

// ### Uncoment to bypass SSL certification ###
// const agent = new https.Agent({
//	rejectUnauthorized: false
// });

router.get('/data', (req, res) => {
	const { id, searchPhrase, count, status, sectionIds } = req.query;

	// Check the endpoint requested
	if (id) {
		// Handle request for a specific submission ID
		fetch(`${apiUrl}/submissions/${id}`, {
			headers: {
				'Authorization': 'Bearer ' + apiKey
			},
			agent
		})
		.then(response => {
			if (response.status === 404) {
				throw new Error('Resource not found.');
			}
			if (!response.ok) {
				throw new Error('Request failed. Status: ' + response.status);
			}
			return response.json();
		})
		.then(data => {
			if (data === null) {
				// Handle the case of a 404 error
				console.log('Resource not found: ', id);
				return null;
			}
			
			// Extract the publication information
			const publications = data.publications || [];
			const firstPublication = publications[0] || {};
			const fullTitle = firstPublication.fullTitle && firstPublication.fullTitle.en_US;
			const status = firstPublication.status;

			// Create the response object with the extracted information
			const responseData = {
				fullTitle,
				status
			};

			res.json(responseData);
		})
		.catch(error => {
			console.error('Error:', error);
			res.sendStatus(500); // Return an error status in case of failure
		});
	} else if (searchPhrase) {
		// Handle request for searching submissions
		const params = new URLSearchParams({
			searchPhrase,
			count,
			status,
			sectionIds
		});

		fetch(`${apiUrl}/submissions?${params.toString()}`, {
			headers: {
				'Authorization': 'Bearer ' + apiKey
			},
			method: 'GET',
			agent
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Request failed.');
				}
				return response.json();
			})
			.then(data => {
				if (Array.isArray(data.items)) {
					const formattedData = data.items.map(item => {
						if (item.publications && item.publications.length > 0) {
							const publication = item.publications[0];
							if (publication.fullTitle && publication.fullTitle.en_US) {
								return {
									id: item.id,
									title: publication.fullTitle.en_US
								};
							}
						}
						return null;
					}).filter(item => item !== null);
					res.json(formattedData);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				res.sendStatus(500);
			});
		} else {
			// Invalid endpoint requested
			res.sendStatus(404);
		}
});

module.exports = router;
