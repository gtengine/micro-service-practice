const express = require("express");
const http = require("http");
const mongodb = require("mongodb");

const app = express();

const PORT = process.env.PORT;
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;

function main() {
  return mongodb.MongoClient.connect(DB_HOST).then((client) => {
    const db = client.db(DB_NAME);
    const videosCollection = db.collection("videos");

    app.get("/video", (req, res) => {
      const videoId = new mongodb.ObjectId(req.query.id);
      videosCollection
        .findOne({ _id: videoId })
        .then((videoRecord) => {
          if (!videoRecord) {
            res.sendStatus(404);
            return;
          }
          const forwardRequest = http.request(
            {
              host: VIDEO_STORAGE_HOST,
              port: VIDEO_STORAGE_PORT,
              path: `/video?path=${videoRecord.videoPath}`,
              method: "GET",
              headers: req.headers,
            },
            (forwardResponse) => {
              res.writeHeader(
                forwardResponse.statusCode,
                forwardResponse.headers
              );
              forwardResponse.pipe(res);
            }
          );
          req.pipe(forwardRequest);
        })
        .catch((err) => {
          console.error("Database query failed.");
          console.error((err && err.stack) || err);
          res.sendStatus(500);
        });
    });
    app.listen(PORT, () => {
      console.log("Microservice Online");
    });
  });
}

main()
  .then(() => console.log("Microservice online."))
  .catch((err) => {
    console.error("Microservice failed to start.");
    console.error((err && err.stack) || err);
  });
