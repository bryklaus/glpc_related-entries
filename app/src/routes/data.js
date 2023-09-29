// Handle API requests to the OJS API

const express = require('express');
const router = express.Router();
const https = require('https');
const fetch = require('node-fetch');
const apiUrl = process.env.OJS_PROTOCOL_AND_DNS + process.env.OJS_BASE_URI + '/api/v1';
const apiKey = process.env.OJS_API_KEY;

// ### Uncoment to bypass SSL certification ###
// const agent = new https.Agent({
//	rejectUnauthorized: false
// });

router.get('/data', (req, res) => {

	// TWO OPTIONS FOR RETRIEVING DATA:
	//    A) ENTRY ID (ONE ENTRY)
	//    B) SEARCH PHRASE (MULTIPLE ENTRIES)
	
	const { id, searchPhrase, count, status, sectionIds } = req.query;

	// A) IF DATA ARE REQUESTED FOR A SPECIFIC ENTRY USING THE ID, DO THIS:
	
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
			let fullTitle = '';

			if (firstPublication.fullTitle) {
				// Use the locale at the submission level as the language
				const language = data.locale || "en_US"; // Default to "en_US" if no locale is provided

				// Check if the language is available in the fullTitle object
				if (firstPublication.fullTitle[language]) {
					fullTitle = firstPublication.fullTitle[language];
				} else {
					// If the language is not available, fallback to the default language (en_US)
					if (firstPublication.fullTitle.en_US) {
						fullTitle = firstPublication.fullTitle.en_US;
					} else {
						// If the default (en_US) is not available, use any available language as a backup
						for (const lang in firstPublication.fullTitle) {
							if (firstPublication.fullTitle[lang]) {
								fullTitle = firstPublication.fullTitle[lang];
								break;
							}
						}
					}
				}
			}

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

	// B) ELSE IF DATA ARE REQUESTED USING A SEARCH PHRASE, DO THIS:
	
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
							let title = '';

							const language = item.locale || "en_US"; // Default to "en_US" if no locale is provided

							if (publication.fullTitle && publication.fullTitle[language]) {
								title = publication.fullTitle[language];
							} else {
								if (publication.fullTitle && publication.fullTitle.en_US) {
									title = publication.fullTitle.en_US;
								} else {
									for (const lang in publication.fullTitle) {
										if (publication.fullTitle[lang]) {
											title = publication.fullTitle[lang];
											break;
										}
									}
								}
							}
							
							return {
								id: item.id,
								title: title
							};
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
