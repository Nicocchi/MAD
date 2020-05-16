require('dotenv').config();
const express = require('express');
const multer = require('multer');
const MongoClient = require('mongodb').MongoClient;
const mongodb = require('mongodb');
const ObjectID = require('mongodb').ObjectID;
const { Readable } = require('stream');
const trackRoute = express.Router({ mergeParams: true });

function getRandomArbitrary(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

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
});

trackRoute.get('/', (req, res) => {
    res.send("Track endpoint!")
})

/**
 * GET /tracks/random
 * accepts query param of ?amount=<number>
 */
trackRoute.get('/random', (req, res) => {
    const amount = req.query.amount && Number(req.query.amount) > 1 ? Number(req.query.amount) : 4;

    // Get all the tracks from the database and then send out four random tracks
    db.collection("tracks.files").find({}).toArray((err,result) => {
        if (err) return res.status(400).send(err);

        // Map out a new array with four random tracks
        const randomArr = [...Array(amount)].map(() => {
            const index = getRandomArbitrary(0, result.length);
            return result[index];
        });

        res.json({ songs: randomArr });
    });
});

/**
 * GET /tracks/:trackID
 */
trackRoute.get('/:trackID', (req, res) => {
    // Cast the string value in the req.params.trackID to a mongoDB ObjectID
    // dince the openDownloadStream method requires a variable of type objectID to be passed to it
    try {
        var trackID = new ObjectID(req.params.trackID);
    } catch (err) {
        return res.status(400).json({message: "Invalid trackID in URL parameter. Must be a single String of " +
                "12 bytes or a string of 24 hex characters"});
    }

    res.set('content-type', 'audio/mp3');
    res.set('accept-ranges', 'bytes');

    let bucket = new mongodb.GridFSBucket(db, {
        bucketName: 'tracks'
    });

    let downloadStream = bucket.openDownloadStream(trackID);

    // Star the stream flowing. Emitted each time a chunk is available
    downloadStream.on('data', (chunk) => {
        res.write(chunk);
    });

    // Stream has encountered an error, send the error back to the client
    downloadStream.on('error', () => {
        res.sendStatus(404);
    });

    // Stream has ended so end the response process
    downloadStream.on('end', () => {
        res.end();
    });
});

/**
 * POST /tracks
 */
trackRoute.post('/', (req, res) => {
    // Store the uploaded file in a buffer while it is being processed,
    // preventing the file from ever being written to the file system
    const storage = multer.memoryStorage();

    // limits -> 1 non-file field, a max file size of 6Mb, max file of 1 in the request and a max of 2 parts
    // (files + fields)
    const upload = multer({ storage, limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 }});

    // Accept a single file with the track name
    upload.single('track')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: "Upload Request Validation Failed" });
        } else if (!req.body.name) {
            return res.status(400).json({ message: "No track name in the request body" });
        }

        let trackName = req.body.name;

        // Convert buffer to Readable Stream
        const readableTrackStream = new Readable();
        readableTrackStream.push(req.file.buffer);
        readableTrackStream.push(null);

        let bucket = new mongodb.GridFSBucket(db, {
            bucketName: 'tracks'
        });

        let uploadStream = bucket.openUploadStream(trackName);
        let id = uploadStream.id;

        // Push all the data to the writable stream
        readableTrackStream.pipe(uploadStream);

        // If stream writing has an error
        uploadStream.on('error', () => {
            return res.status(500).json({ message: "Error uploading file" });
        });

        // Stream writing has finished
        uploadStream.on('finish', () => {
            return res.status(201).json({ message: `File uploaded successfully, stored under Mongo ObjectID: ${id}`});
        });
    });
});

module.exports = trackRoute;