require('dotenv').config()
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const apiRouter = require("./routes/apiRouter");
const bodyParser = require('body-parser');

/**
 * Setup Express server and router configuration
 */
const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

/**
 * Connect Mongodb
 */
let db;
MongoClient.connect(process.env.DATABASE_URI, (err, database) => {
    if (err) {
        console.log('MongoDB Connection Error. Please make sure that MongoDB is running.');
        process.exit(1);
    }

    db = database.db('trackDB');
    database.close();
});

app.use('/api', apiRouter);

apiRouter.get('/', (req, res) => {
    res.send("Root endpoint!")
})

app.listen(3005, () => {
    console.log("App listening on port 3005!");
});