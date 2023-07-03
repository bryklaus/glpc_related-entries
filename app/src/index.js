const express = require('express');
const app = express();
const db = require('./db');
const { allowCrossDomain } = require('./auth');
const apiCall = require('./routes/apiCall');
const addItem = require('./routes/addItem');
const getItems = require('./routes/getItems');
const deleteItem = require('./routes/deleteItem');
const dataRoute = require('./routes/data');

app.use(allowCrossDomain);
app.use(apiCall);
app.use(express.static(__dirname + '/static'));
app.use('/api', dataRoute);
app.post('/items/add-item', addItem);
app.get('/items', getItems);
app.delete('/items/:id', deleteItem);

db.init()
  .then(() => {
    app.listen(3000, '0.0.0.0', () => console.log('Listening on port 3000'));
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

const gracefulShutdown = () => {
  db.teardown()
    .catch(() => {})
    .then(() => process.exit());
};
