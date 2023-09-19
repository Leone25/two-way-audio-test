import config from './config.example.js';
import http from 'http';
import { spawn } from 'child_process';
import { parseStringPromise } from 'xml2js';

const base_url = `http://${config.username}:${config.password}@${config.host}`;

const formatRequest = http.request(`${base_url}/ISAPI/System/TwoWayAudio/channels/${config.id}`, { // this gets the active audio format, technically you can change this with a put request, but I haven't been able to get it to work, not sure what is wrong, server responds with 200, but the format doesn't change, for now we'll just read whatever is set and convert the audio to it
    method: 'GET',
    headers: {
        'Content-Type': 'application/octet-stream'
    }
});

formatRequest.on('response', (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(`statusMessage: ${res.statusMessage}`);
    res.on('data', async function (chunk) {
        console.log('CAPABILITIES: ' + chunk);
        let audioCapabilites = await parseStringPromise(chunk);
        const openRequest = http.request(`${base_url}/ISAPI/System/TwoWayAudio/channels/${config.id}/open`, {
            method: 'PUT',
            headers: {
                'Content-Length': 0,
                'Content-Type': 'application/octet-stream',
            }
        });
        
        openRequest.on('response', (res) => {
            console.log(`statusCode: ${res.statusCode}`);
            console.log(`statusMessage: ${res.statusMessage}`);
            res.on('data', async function (chunk) {
                console.log('BODY: ' + chunk);
        
                let body = await parseStringPromise(chunk);
                

                // Send audio to camera
                const ffmpeg = spawn('ffmpeg', [
                    '-i',
                    config.audio,
                    "-codec:a", 
                    (audioCapabilites.TwoWayAudioChannel.audioCompressionType == "G.711ulaw" ? "pcm_mulaw" : "pcm_alaw"), // all possible formats are G.711alaw,G.711ulaw,G.726,G.729,G.729a,G.729b,PCM,MP3,AC3,AAC,ADPCM
                    "-ac", 
                    "1",
                    "-ar", 
                    "8000",
                    "-f", 
                    "wav",
                    "-sample_fmt", 
                    "s16",
                    "-"
                ]);
            
                let dataRequest = http.request(`${base_url}/ISAPI/System/TwoWayAudio/channels/${config.id}/audioData`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': 0,
                        'Connection': 'keep-alive',
                        'sessionId': body.TwoWayAudioSession.sessionId[0],
                    }
                });
            
                ffmpeg.stdout.pipe(dataRequest);
            
                ffmpeg.stderr.on('data', (data) => {
                    console.error(`[FFMPEG] ${data}`);
                });
            
                dataRequest.on('error', (e) => {
                    console.log(e);
                    ffmpeg.kill();
                });
            
                ffmpeg.on('close', (code) => {
                    console.log(`ffmpeg exited with code ${code}`);
                    dataRequest.end();
                    process.exit();
                });


                // Receive audio from camera
                const ffplay = spawn('ffplay', [
                    '-i',
                    '-',
                    "-f", 
                    (audioCapabilites.TwoWayAudioChannel.audioCompressionType == "G.711ulaw" ? "pcm_mulaw" : "pcm_alaw"),
                    "-ar",
                    "8k",
                    "-ac",
                    "1",
                    "-nodisp",
                ]);
            
                let dataSend = http.request(`${base_url}/ISAPI/System/TwoWayAudio/channels/${config.id}/audioData`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': 0,
                        'Connection': 'keep-alive',
                        'sessionId': body.TwoWayAudioSession.sessionId[0],
                    }
                });
            
                ffplay.stderr.on('data', (data) => {
                    console.error(`[FFPLAY] ${data}`);
                });
            
                dataSend.on('error', (e) => {
                    console.log(e);
                    ffplay.kill();
                });
            
                ffplay.on('close', (code) => {
                    console.log(`ffplay exited with code ${code}`);
                    dataSend.end();
                    process.exit();
                });

                dataSend.on('socket', (socket) => {
                    socket.on('data', (data) => {
                        ffplay.stdin.write(data);
                    });
                });

                dataSend.end();
            });
        });
        
        openRequest.on('error', (e) => {
            console.error(e);
        });
        
        openRequest.end();
    });
});

formatRequest.on('error', (e) => {
    console.error(e);
}); 

formatRequest.end();