
'use strict'
const express = require('express');
const morga = require('morgan')
var os = require('os');
const ipHost = require('./config/configApi.json')

const NetworkConfig = require('./Utils/networkServices/networkConfig');
NetworkConfig.updateIpServer();

const app = express();

const bodyParser = require('body-parser')
const cors = require('cors')

const http = require('http');
const socketIo = require('socket.io');

const path =  require('path');


// backups DB
// const backupDb = require('./database/collection/backupsDB/generateBackup');
// backupDb();

const connect = require('./database/collection/connectionDB')

const services = require('./routes/api/v0.1/services')
const roles = require('./database/collection/setupConfigRoles/setupConfigRoles');
const updateData = require('./Utils/actulizarLosDatosAPositivos/actualizarLosDatosApositivos');
const Reporte = require('./routes/api/v0.1/businesLogic/reportes');
// const { consumers } = require('stream');

roles()

// actualizar los datos a positivos
// updateData()


const PORT = process.env.PORT || 4000;


app.use(morga('dev'))
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())

app.use(cors());
const publicDirectoryPath = path.join(__dirname, 'public');

app.use(express.static(publicDirectoryPath));

// Environment for development
app.use('/',services)


// Environment for production
app.use("/api/v0.1", services);

// test reportes
// Reporte.listarProductos();

// configuracion de socketio
const server = http.createServer(app)
global.io  = socketIo(server,{
    cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket)=>{
    console.log('socket conected: ', socket.id)
    socket.on('meesage',body=>{
        console.log(body);
        socket.broadcast.emit('message',{
            body,
            form : socket.id.slice(8)
        })
    })
    socket.on('disconnect',()=>{
        console.log('socket disconnect: ', socket.id)

    })
})


const listName = ['chapita', 'carmen']
app.get('/listnames',(req,res)=>{
res.json(listName)
});


app.post('/listnames',(req,res)=>{
    listName.push(req.body.name)
    io.emit('[user] addNewUser',listName)
    console.log(Object.keys(io))
    // console.log(io)
    
});


server.listen(PORT,()=>{
    console.log(`Api-Rest runing in port : ${ipHost.configApi[0].hostApi}:${PORT}`)
})


// importacion del modulo de socketio
// module.exports = socketIo(server);
// C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp