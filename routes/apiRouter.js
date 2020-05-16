const express = require("express");
const apiRouter = express.Router();

const trackRouter = require('./tracks/tracks');

apiRouter.use("/tracks", trackRouter);

module.exports = apiRouter;