const db = require('../db');

module.exports = async (req, res) => {
	const { entryId } = req.query; // Get the entry_id from the query parameters

	if (entryId) {
		const items = await db.getItemsByEntryId(entryId); // Retrieve items with matching entry_id
		res.send(items);
	} else {
		const items = await db.getItems(); // Retrieve all items if no entry_id provided
		res.send(items);
	}
};
