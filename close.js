import config from './config.example.js';
import http from 'http';
import { spawn } from 'child_process';
import { parseStringPromise } from 'xml2js';

const base_url = `http://${config.username}:${config.password}@${config.host}`;

const openRequest = http.request(`${base_url}/ISAPI/System/TwoWayAudio/channels/${config.id}/close`, {
    method: 'PUT',
    headers: {
        'Content-Length': 0
    }
});

openRequest.on('response', (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(`statusMessage: ${res.statusMessage}`);
    res.on('data', async function (chunk) {
        console.log('BODY: ' + chunk);
    });
});

openRequest.on('error', (e) => {
    console.error(e);
});

openRequest.end();
