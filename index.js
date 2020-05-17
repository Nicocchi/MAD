require('dotenv').config()
const express = require('express');
const cors = require('cors');
const apiRouter = require("./routes/apiRouter");
const bodyParser = require('body-parser');

/**
 * Setup Express server and router configuration
 */
const app = express();
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.use('/api', apiRouter);

apiRouter.get('/', (req, res) => {
    res.send("Root endpoint!")
})

app.listen(3005, () => {
    console.log("App listening on port 3005!");
});