// Cross-References 1.0 (Client Side: OJS Frontend)
// Designed by Bryan Klausmeyer

const currentEntryId = window.location.href.split('/').pop();

let dockerApiBaseUrl = null;

function setDockerApiBaseUrl() {
	dockerApiBaseUrl = new URL(document.currentScript.src).origin;
}

setDockerApiBaseUrl();

const dockerApiUrl = () => {
	if (!dockerApiBaseUrl) {
		console.error('Docker API base URL not set. Make sure to call setDockerApiBaseUrl() first.');
	}
	return dockerApiBaseUrl;
};

const url = `${dockerApiUrl()}/items?entryId=${currentEntryId}`;

function fetchJsonData(url) {
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
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            throw error;
        });
}

function getEntryTitles(ids) {
  var requests = ids.map(function(id) {
    return $.ajax({
      url: dockerApiUrl() + "/api/data?id=" + id,
      method: "GET",
      dataType: "json"
    });
  });

  return Promise.all(requests)
    .then(function(responses) {
      var titles = responses.map(function(response) {
        if (response && response.fullTitle) {
          return response.fullTitle;
        }
        return "";
      });

      return titles;
    })
    .catch(function(error) {
      console.error("Error:", error);
      return [];
    });
}

function createListItem(item) {
	const listItem = document.createElement('li');

	getEntryTitles([item.related_entry_id])
		.then(function(titles) {
			const relatedEntryTitle = titles[0];

			const itemText =
				'<span class="item-content"><span class="item-related"><a href="{{OJS_BASE_URI}}/article/view/' + item.related_entry_id + '">' + relatedEntryTitle + '</a></span></span>';

			listItem.innerHTML = itemText;
			listItem.classList.add('entry-item');
			listItem.classList.add(`item-${item.id}`);
		})
		.catch(function(error) {
			console.error("Error:", error);
		});
	return listItem;
}

function createList(data) {
	const ids = data.map(item => item.related_entry_id);
	return getEntryTitles(ids)
		.then(titles => {
			data.sort((a, b) => {
				const titleA = titles[ids.indexOf(a.related_entry_id)];
				const titleB = titles[ids.indexOf(b.related_entry_id)];
				return titleA.localeCompare(titleB);
			});
			
			if (data.length === 0) {
				return null;
			}

			const list = document.createElement('ul');
			list.id = 'entries_list';

			const fragment = document.createDocumentFragment();
			data.forEach(item => {
				const listItem = createListItem(item);
				fragment.appendChild(listItem);
			});
			list.appendChild(fragment);

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

// Check if the URL structure matches the desired pattern
if (window.location.href.includes("{{OJS_BASE_URI}}/article/view/")) {
	window.addEventListener('load', async function() {
		try {
			const data = await fetchJsonData(url);
			const result = await createList(data);

			await new Promise(function (resolve) {
				setTimeout(function () {
					resolve(result);
				}, 0);
			});

			var parentElement = document.querySelector('.pkp_block.block_galleys');

			var newDiv = document.createElement('div');
			newDiv.className = 'pkp_block block_inline_html_related';

			var titleSpan = document.createElement('span');
			titleSpan.className = 'title';
			titleSpan.innerHTML = 'Cross References';

			newDiv.insertBefore(titleSpan, newDiv.firstChild);

			var contentDiv = document.createElement('div');
			contentDiv.className = 'content';

			var relatedEntriesDiv = document.createElement('div');
			relatedEntriesDiv.className = 'related-entries';

			relatedEntriesDiv.appendChild(result.list);

			contentDiv.appendChild(relatedEntriesDiv);

			newDiv.appendChild(contentDiv);

			parentElement.insertAdjacentElement('afterend', newDiv);
		} catch (error) {
			console.error('Error:', error);
		}
	});
}
