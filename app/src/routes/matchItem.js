const db = require('../db');

module.exports = async (req, res) => {
	const entryId = req.body.entryId;
	const relatedEntryId = req.body.relatedEntryId;

	try {
		const matchingItem = await db.matchItem(entryId, relatedEntryId);

		if (matchingItem) {
			res.send(matchingItem);
		} else {
			res.status(404).send('Matching item not found');
		}
	} catch (err) {
		console.error(err);
		res.status(500).send('Error finding matching item');
	}
};
