# Two-way Audio Test

This is a demo script that allows you to stream and listen to two-way audio from your DVR/NVR (Hikvision, or clones like Annke, etc.) using the [Hikvision ISAPI](https://github.com/loozhengyuan/hikvision-sdk/blob/master/resources/isapi.pdf) and [FFmpeg/FFplay](https://ffmpeg.org/).

## Requirements

- [Node.js](https://nodejs.org/en/) tested on v18.14.0
- [FFmpeg](https://ffmpeg.org/) in your PATH
- [FFplay](https://ffmpeg.org/ffplay.html) in your PATH

## Usage

1. Clone this repository
2. Run `npm install`
3. Make a copy of `config.example.js` and rename it to `config.js`
4. Edit config.json and fill in the required fields
5. Run `node index.js`
6. Audio should start playing out of the DVR/NVR output and your computer should start play the audio from the DVR/NVR input
7. Press `Ctrl+C` to stop the script

## Notes

I've included a `close.js` script, this is some times required when the audio stream is opened and never played (read below for more details). This script will close the audio stream.

## TL;DR How it works

1. `GET /ISAPI/System/TwoWayAudio/channels/{id}` The script requests info about the audio input and output from the DVR/NVR, mainly we care about the codec.
2. `PUT /ISAPI/System/TwoWayAudio/channels/{id}/open` The script then tells the DVR/NVR to open the audio stream. This will also return a `sessionId`, that needs to be included in the next two steps as header.
3. `PUT /ISAPI/System/TwoWayAudio/channels/{id}/audioData` The script then starts FFmpeg to receive and convert the audio stream to a format that the DVR/NVR can play, and sends it trough this link; This is not really an valid HTTP request because the DVR/NVR will never be allowed to answer, what we do is start the request, and keep pushing data with `.write(data)` and never call `.end()`.
**Note:** you HAVE to send audio data to the DVR/NVR otherwise it will not send audio back (found out the hard way), if you only care about listening, you can just send 160 bytes of FF (or 00 works too) every 20ms (which basically equates a silent stream)
4. `GET /ISAPI/System/TwoWayAudio/channels/{id}/audioData` The script then starts FFplay to play the received data. In this case it's the opposie, because the DVR/NVR will never end the request, and it will keep sending data untill we close the connection. The data received is simply passed to FFplay trough stdin to be played on the speakers.
5. `PUT /ISAPI/System/TwoWayAudio/channels/{id}/close` (mostly optional) The script then tells the DVR/NVR to close the audio stream. This is done automatically if the stream is stopped, but if the stream is never played, the DVR/NVR will keep the stream open, and you will not be able to open a new stream untill you make this request (there is not need for the sessionId in this request, so one could just make this request every time before opening).

## License

MIT
