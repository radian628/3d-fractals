// content of index.js
const http = require('http');
const fs = require('fs');

const port = 42068;

const requestHandler = (request, response) => {


    var dataURL = request.url.slice(1);
    fs.readFile(dataURL, (err, data) => {
        if (err) {
            //console.log(dataURL + " not found!");
            response.end();
        } else {
            //console.log(dataURL + " found!");
            response.end(data);
        }
    });
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
    if (err) {
        return console.log("Error:", err);
    }

    console.log(`server is listening on ${port}`)
})