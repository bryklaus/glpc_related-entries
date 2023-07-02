const db = require('../db');

module.exports = async (req, res) => {
	const itemId = req.params.id; // Assuming the client-side sends the itemId to delete

	try {
		const item = await db.getItem(itemId); // Retrieve the item to delete

		if (!item) {
			return res.status(404).send('Item not found');
		}

		const entryId = item.entry_id;
		const relatedEntryId = item.related_entry_id;

		// Delete the A-B relation
		await db.removeItem(itemId);

		// Find the matching B-A relation
		const matchingItem = await db.matchItem(entryId, relatedEntryId);

		if (matchingItem) {
			// Delete the B-A relation
			await db.removeItem(matchingItem.id);
		}

		res.send('Item deleted successfully');
	} catch (err) {
		console.error(err);
		res.status(500).send('Error deleting item');
	}
};
