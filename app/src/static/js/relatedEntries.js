// Cross-References 1.0 (Client Side: OJS Backend)
// Designed by Bryan Klausmeyer

var dockerApiUrl = ''; // Full URL (and, where applicable, port) for public-facing Docker app (no forward slash at end)
var currentEntryId;

var cache = {};
var cacheKeys = [];

// Check if the current URL matches the OJS Workflow URL
function checkWorkflowAccess() {
	var workflowAccess = /\/GL\/workflow\/index\/(\d+)\/(\d+)$/;
	var workflowMatch = window.location.pathname.match(workflowAccess);
	if (workflowMatch !== null) {
		currentEntryId = parseInt(workflowMatch[1]);
		var workflowStepId = parseInt(workflowMatch[2]);
		return { currentEntryId: currentEntryId, workflowStepId: workflowStepId };
	}
	return null;
}

// Fetch the user's API key using AJAX
function getApiKey() {
	return new Promise((resolve, reject) => {
		console.log('Fetching API key...');
		$.ajax({
			url: '/GL/$$$call$$$/tab/user/profile-tab/api-profile',
			dataType: 'json',
			success: function(data) {
				var htmlContent = data.content;
				var apiKeyElement = $('<div>').html(htmlContent).find('input[name="apiKey"]');
				var apiKey = apiKeyElement.val();

				if (apiKey !== 'None') {
					resolve(apiKey);
					console.log('API key fetched successfully.');
				} else {
					reject(new Error('No API key.'));
					console.log('Error: No API key.');
				}
			},
			error: function(xhr, success, error) {
				reject(new Error('Failed to fetch API key: ' + error));
				console.error('Failed to fetch API key: ', error);
			}
		});
	});
}

// Send the API key to the Docker app for verification
function sendApiKey(apiKey) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: dockerApiUrl + '/api/call',
			type: 'POST',
			data: { apiKey: apiKey },
			success: function(response) {
				if (response.success) {
					resolve();
				} else {
					reject(new Error('API call failed'));
				}
			},
			error: function(xhr, textStatus, errorThrown) {
				reject(new Error(textStatus));
			}
		});
	});
}

// Fetch JSON data from the server-side app
function fetchJsonData(url) {
	var cachedData = cache[url];
	if (cachedData) {
		return Promise.resolve(cachedData);
	}
	
	return fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok.');
			}
			const contentType = response.headers.get('Content-Type');
			if (!contentType || !contentType.includes('application/json')) {
				throw new TypeError('Response was not JSON');
			}
			return response.json();
		})
		.then(data => {
			cache[url] = data;
			return data;
		})
		.catch(error => {
			console.error('There was a problem with the fetch operation:', error);
			throw error;
		});
}

// Get the publication status of an entry
async function getPublicationStatus(entryId) {
	try {
		const response = await fetch(`${dockerApiUrl}/api/data?id=${entryId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const data = await response.json();
			return data.status;
		} else {
			throw new Error('Failed to retrieve publication status.');
		}
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
}

// Append a CSS file and create a container for Related Entries
function createRelatedEntriesContainer() {
	return new Promise((resolve, reject) => {
		var linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = dockerApiUrl + '/css/relatedEntries.css';
		document.head.appendChild(linkElement);

		const divRelatedEntries = document.createElement('div');
		divRelatedEntries.classList.add('related_entries');
		divRelatedEntries.innerHTML = '<h3>Cross References</h3>';
		document.body.appendChild(divRelatedEntries);

		resolve(divRelatedEntries);
	});
}

// Retrieve an entry title for any given ID
function getEntryTitles(ids) {
	// Create an array of AJAX requests for each ID
	var requests = ids.map(function(id) {
		return $.ajax({
			url: dockerApiUrl + "/api/data?id=" + id,
			method: "GET",
			dataType: "json",
			error: function(jqXHR, textStatus, errorThrown) {
				if (jqXHR.status === 500) {
					return { fullTitle: '' }; // Return empty title for 404
				} else {
					throw new Error('Network response was not okay.');
				}
			}
		});
	});

	// Execute all AJAX requests concurrently using Promise.all
	return Promise.all(requests)
		.then(function(responses) {
			// Process the responses and extract the titles
			var titles = responses.map(function(response) {
				if (response && response.fullTitle) {
					return response.fullTitle;
				}
				return "";
			});

			return titles;
		})
		.catch(function(error) {
			console.error("Error: ", error);
			return [];
		});
}

// Create a list item in the OJS backend
function createListItem(item) {
	const listItem = document.createElement('li');

	getEntryTitles([item.related_entry_id])
		.then(function(titles) {
			const relatedEntryTitle = titles[0];

			const itemText = '<span class="item-content"><span class="item-related"><a href="/GL/workflow/index/' + item.related_entry_id + '/4">' + relatedEntryTitle + '</a></span></span>';

			listItem.innerHTML = itemText;
			listItem.classList.add('entry-item');
			listItem.classList.add(`item-${item.id}`);

			const deleteButton = document.createElement('button');
			deleteButton.textContent = '—';
			deleteButton.classList.add('delete-button');
			listItem.appendChild(deleteButton);
		})
		.catch(function(error) {
			console.error("Error:", error);
		});
	return listItem;
}

function createList(data) {
	// Get the related entry titles for sorting
	const ids = data.map(item => item.related_entry_id);
	return getEntryTitles(ids)
		.then(titles => {
			// Sort the data array based on the related entry titles
			data.sort((a, b) => {
				const titleA = titles[ids.indexOf(a.related_entry_id)];
				const titleB = titles[ids.indexOf(b.related_entry_id)];
				return titleA.localeCompare(titleB);
			});

			// Create the unordered list
			const list = document.createElement('ul');
			list.id = 'entries_list';

			// Loop through the sorted data and create list items
			const fragment = document.createDocumentFragment();
			data.forEach(item => {
				const listItem = createListItem(item);
				fragment.appendChild(listItem);
			});
			list.appendChild(fragment);

			// Add a click listener to the list to handle item deletion
			list.addEventListener('click', (event) => {
				if (event.target.classList.contains('delete-button')) {
					deleteItem(event.target.parentNode);
				}
			});

			// Return the completed list
			return {
				list: list,
				count: data.length
			};
		})
		.catch(error => {
			console.error("Error:", error);
			return null;
		});
}

// Delete an item from the list
function deleteItem(listItem) {
	const itemId = listItem.classList[1].replace('item-', '');

	// Prompt the user for confirmation
	const confirmed = confirm('Are you sure you want to delete this cross-reference?');
	if (!confirmed) {
		return; // Abort the deletion if not confirmed
	}

	fetch(`${dockerApiUrl}/items/${itemId}`, { method: 'DELETE' })
		.then(response => {
			if (response.ok) {
				console.log(`Deleting item with ID ${itemId}`);
				listItem.parentNode.removeChild(listItem);
			} else {
				throw new Error('Network response was not ok.');
			}
		})
		.catch(error => {
			console.error('There was a problem with the fetch operation:', error);
		});
}

// AJAX autocomplete functionality w/ caching
function searchSubmissions(request, response) {
	const maxResults = 10;
	const maxCacheSize = 100;

	var cacheKey = request.term.toLowerCase();
	var cachedResults = cache[cacheKey];

	if (cachedResults) {
		// Move the cache key to the end of the list to indicate it was accessed most recently
		var index = cacheKeys.indexOf(cacheKey);
		cacheKeys.splice(index, 1);
		cacheKeys.push(cacheKey);

		response(cachedResults);
	} else {
		$.ajax({
			url: dockerApiUrl + '/api/data',
			method: "GET",
			dataType: "json",
			data: {
				searchPhrase: request.term,
				count: 25,
				status: '3,5',
				sectionIds: 1
			},
			success: function(data) {
				var suggestions = [];
				for (var i = 0; i < data.length; i++) {
					var item = data[i];
					var value = item.id;
					var label = item.title;

					if (label.toLowerCase().indexOf(request.term.toLowerCase()) === 0) {
						suggestions.push({
							value: value,
							label: label
						});
					}
				}

				var regex = new RegExp('^' + request.term, 'i');
				var filteredSuggestions = $.grep(suggestions, function(item) {
					return regex.test(item.label);
				}).slice(0, maxResults);

				cache[cacheKey] = filteredSuggestions;
				cacheKeys.push(cacheKey);

				// If the cache size exceeds the maximum, remove the least recently used item
				if (cacheKeys.length > maxCacheSize) {
					var oldestCacheKey = cacheKeys.shift();
					delete cache[oldestCacheKey];
				}

				response(filteredSuggestions);
			},
		});
	}
}

// Create the input box and position it correctly
function createInputBox() {
	const inputBox = document.createElement('input');
	inputBox.type = 'text';
	inputBox.id = 'searchEntries';
	inputBox.placeholder = 'Search for a title';

	const entryIdInput = document.createElement('input');
	entryIdInput.type = 'hidden';
	entryIdInput.id = 'entryId';

	const container = document.createElement('div');
	container.appendChild(inputBox);
	container.appendChild(entryIdInput);

	$(document).ready(function() {
		$(inputBox).autocomplete({
		  minLength: 2,
		  delay: 550,
		  selectFirst: true,
		  source: searchSubmissions,
		  change: function(event, ui) {
			if (ui.item == null) {
			  inputBox.value = '';
			  entryIdInput.value = '';
			}
		  },
		  focus: function(event, ui) {
			event.preventDefault();
			inputBox.value = ui.item.label;
			entryIdInput.value = ui.item.value;
		  },
		  select: function(event, ui) {
			event.preventDefault();
			inputBox.value = ui.item.label;
			entryIdInput.value = ui.item.value;
		  },
		  open: function(event, ui) {
			var autocompleteResults = $('.ui-autocomplete');
			var inputBoxOffset = $(inputBox).offset();
			var inputBoxWidth = $(inputBox).outerWidth();

			autocompleteResults.css({
			  'width': inputBoxWidth,
			  'left': inputBoxOffset.left
			});

			if (autocompleteResults.outerHeight() > $(window).height() - inputBoxOffset.top) {
			  autocompleteResults.position({
				my: 'left bottom',
				at: 'left top',
				of: inputBox,
				collision: 'flipfit'
			  });
			} else {
			  autocompleteResults.position({
				my: 'left top',
				at: 'left bottom',
				of: inputBox,
				collision: 'flipfit'
			  });
			}
		  }
		}).autocomplete("instance")._renderItem = function(ul, item) {
		  return $("<li>").append("<div>" + item.label + "</div>").appendTo(ul);
		};

		inputBox.addEventListener('keydown', async (event) => {
		  if (event.key === 'Enter') {
			const item = entryIdInput.value;
			entryIdInput.value = '';
			inputBox.value = '';

			if (!item) {
			  // Display error message
			  const errorMessage = document.createElement('div');
			  errorMessage.textContent = 'Invalid entry.';
			  errorMessage.classList.add('feedback', 'error');
			  container.appendChild(errorMessage);

			  setTimeout(() => {
				errorMessage.remove();
			  }, 2000);

			  return; // Abort execution
			}

			try {
			  const result = await addItem(item);
			  console.log('Success: New cross-reference added.');

			  // Display success message
			  const successMessage = document.createElement('div');
			  successMessage.textContent = 'Success!';
			  successMessage.classList.add('feedback', 'success');
			  container.appendChild(successMessage);

			  setTimeout(() => {
				successMessage.remove();
			  }, 2000);
			} catch (error) {
			  if (error.message === 'Duplicate entry') {
				// Display duplicate entry error message
				const errorMessage = document.createElement('div');
				errorMessage.textContent = 'Error: Duplicate entry.';
				errorMessage.classList.add('feedback', 'error');
				container.appendChild(errorMessage);

				setTimeout(() => {
				  errorMessage.remove();
				}, 2000);
			  } else {
				console.error('Error:', error);
			  }
			}
		  }
		});
	});

	return container;
}

// Add a new item
async function addItem(item) {
	const workflowData = checkWorkflowAccess();
	const currentEntryId = workflowData.currentEntryId;
	const payload = {
		item: item,
		currentEntryId: currentEntryId
	};

	try {
		const response = await fetch(dockerApiUrl + '/items/add-item', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json'
			},
		});

		if (response.ok) {
			const data = await response.json();
			const listItem = createListItem(data);
			const list = document.querySelector('#entries_list');
			list.appendChild(listItem);
			return true;
		} else if (response.status === 400) {
			throw new Error('Duplicate entry');
		} else {
			throw new Error('Network response was not ok.');
		}
	} catch (error) {
		throw error;
	}
}

// Load the app
window.addEventListener('load', async function() {
	const workflow = checkWorkflowAccess();
	if (workflow !== null) {
		try {
			const apiKey = await getApiKey();
			console.log('Received API key:', apiKey);
			await sendApiKey(apiKey);
			console.log('API call successful.');
			
			const publicationStatus = await getPublicationStatus(currentEntryId);
			
			if (publicationStatus === 3 || publicationStatus === 5) {
				const divRelatedEntries = await createRelatedEntriesContainer();
				const url = `${dockerApiUrl}/items?entryId=${currentEntryId}`;
				const data = await fetchJsonData(url);

				const listResult = await createList(data);
				const list = listResult.list;
				const count = listResult.count;

				const inputBox = createInputBox();
				const container = document.createElement('div');
				container.classList.add('entries-list-container');
				container.appendChild(inputBox);
				container.appendChild(list);

				const relatedEntries = document.querySelector('.related_entries');
				relatedEntries.appendChild(container);

				let isToggleActive = false;

				relatedEntries.addEventListener('click', function(event) {
					const target = event.target;
					if (target.matches('h3')) {
						target.classList.toggle('active');
						target.nextElementSibling.classList.toggle('active');
						isToggleActive = target.classList.contains('active');
					}
				});

				document.addEventListener('keydown', function(event) {
					if (event.key === 'Escape' && isToggleActive) {
						const activeH3 = relatedEntries.querySelector('h3.active');
						activeH3.classList.remove('active');
						activeH3.nextElementSibling.classList.remove('active');
						isToggleActive = false;
					}
				});

				// Update the related entries heading with the count
				const heading = document.querySelector('.related_entries h3');
				const countSpan = document.createElement('span');
				countSpan.classList.add('entries-count');
				countSpan.textContent = count;

				if (count === 0) {
					countSpan.classList.add('no-entries');
				}

				heading.appendChild(countSpan);
			} else {
				console.log('Current entry does not have the required publication status (3 or 5).');
			}
			
		} catch (error) {
			console.error('Error:', error);
		}
	}
});
