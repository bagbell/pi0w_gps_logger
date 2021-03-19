const { request } = require('express');
const express = require('express');
const ws = require('ws');
const app = express();
const fs = require('fs');

// const isDirectory = source => lstatSync(source).isDirectory()
const directories = fs.readdirSync("./log/", { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
// console.log(directories);

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', socket => {
    sendMessage = function(msg) {
        socket.send(JSON.stringify(msg));
    };

    socket.on('message', msg => {
        data = JSON.parse(msg);
        // console.log(data);
        switch(data.type) {
            case 'yearList':
                sendMessage({type:'yearList', data:directories});
                break;
            case 'dayList':
                // console.log(data);
                files = fs.readdirSync("./log/"+data.year+"/", { withFileTypes: true })
                                .filter(dirent => dirent.isFile())
                                .map(dirent => dirent.name);
                // console.log(files);
                sendMessage({type:'dayList', data: files});
                break;
            case 'gpsList':
                
                let filename = "./log/"+data.year+"/"+data.day;
                // console.log(filename);
                try {
                    fs.readFile(filename, "utf8", function(err, gps) {
                        if (err) throw err;
                        // console.log(data);
                        sendMessage({type:'gpsList',data:gps});
                    });
                    
                } catch(e) {
                    console.log('Error:', e.stack);
                }
                break;
            default:
                break;
        }
    });

    // socket.send({type:'year', data:directories});
    
    

});

app.use(express.static('www'))
const server = app.listen(8080);
server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});