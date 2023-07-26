const db = require('../db');
const { v4: uuid } = require('uuid');

module.exports = async (req, res) => {
	const entryId = req.body.currentEntryId;
	const relatedEntryId = req.body.item;

	// Check for solipsistic entry (A-A relation)
	if (Number(entryId) === Number(relatedEntryId)) {
		return res.status(400).send('Self-referencing entry');
	}
	
	try {
		// Check if A-B relationship already exists
		const existingItemAB = await db.matchItem(entryId, relatedEntryId);
		// Check if B-A relationship already exists
		const existingItemBA = await db.matchItem(relatedEntryId, entryId);

		if (existingItemAB || existingItemBA) {
			// Duplicate entry found, send an error response
			return res.status(400).send('Duplicate entry');
		}

		const itemId = uuid();

		const payload = {
			id: itemId,
			entry_id: entryId,
			related_entry_id: relatedEntryId,
		};

		await Promise.all([
			db.storeItem(payload), // Store the initial item (A-B relationship)
			db.storeItem({
				// Store the reciprocal item (B-A relationship)
				id: uuid(),
				entry_id: relatedEntryId,
				related_entry_id: entryId,
			}),
		]);

		res.send(payload);
	} catch (err) {
		console.error(err);
		res.status(500).send('Error storing item');
	}
};
