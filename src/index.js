const dotenv = require('dotenv').config()
const http = require('http');
const textToSpeech = require('@google-cloud/text-to-speech')
const express = require('express')
const cors = require('cors')
const pavlok = require('pavlok-beta-api-login')
const twitchEmoji = require('twitch-emoji')

const tmi = require('tmi.js');
const twi = new tmi.Client({
	options: { debug: true },
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: 'sweLogan',
		password: 'oauth:3qvruv26985erjhqn75brak16anvr2'
	},
	channels: [ 'sweLogan' ]
});

twi.connect();
const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);

const port = process.env.PORT || 3000
const client = new textToSpeech.TextToSpeechClient();


app.use(cors());
app.use('/', express.static('./src/public'))
// app.use(express.static(__dirname + '/public'));
console.log(__dirname + '/public')
app.set('views', './src/views')
app.set('view engine', 'pug')

pavlok.init(process.env.PAVLOK_ID, process.env.PAVLOK_SECRET, {
	'verbose': true,
	'app' : app,
	'message': 'Hello from the Pavlok Remote example!',
	'callbackUrl': 'https://77719802.ngrok.io/auth/pavlok/result',
	'callbackUrlPath': '/auth/pavlok/result',
	'successUrl': '/',
	'errorUrl': '/error'
});

let user = null;

const generatessml = (text) => {
    let escapedLines = text;
    escapedLines = escapedLines.replace(/&/g, '&amp;');
    escapedLines = escapedLines.replace(/'/g, '&quot;');
    escapedLines = escapedLines.replace(/</g, '&lt;');
    escapedLines = escapedLines.replace(/>/g, '&gt;');

    // Convert plaintext to SSML
    // Tag SSML so that there is a 2 second pause between each address
    const expandedNewline = escapedLines.replace(/\n/g, '\n<break time="2s"/>');
    const ssml = '<speak>' + expandedNewline + '</speak>';
    // Return the concatenated String of SSML
    return ssml;
}
const generatefollowssml = (name) => {
    let escapedLines = name;
    escapedLines = escapedLines.replace(/&/g, '&amp;');
    escapedLines = escapedLines.replace(/'/g, '&quot;');
    escapedLines = escapedLines.replace(/</g, '&lt;');
    escapedLines = escapedLines.replace(/>/g, '&gt;');

    // Convert plaintext to SSML
    // Tag SSML so that there is a 2 second pause between each address
    const expandedNewline = escapedLines.replace(/\n/g, '\n<break time="2s"/>');
    const ssml = `<speak><emphasis level="moderate">This is an important announcement</emphasis> Some <say-as interpret-as="expletive">idiote</say-as> named ${name} thought your twitch stream was funny and follows you now! <say-as interpret-as="characters">LMAO</say-as></speak>`;
    // Return the concatenated String of SSML
    return ssml;
}

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/auth', (req, res ) =>{
	pavlok.auth(req, res);
});

app.get('/zap', (req, res ) =>{
	pavlok.zap({
        'request': req,
        value:80
	});
	console.log('Zapped!');
	res.sendStatus(200)
});

app.get('/vibrate', (req, res ) =>{
	pavlok.vibrate({
        'request': req,
        value:255
	});
	console.log('Vibrated!');
	res.sendStatus(200)
});

app.get('/beep', (req, res ) =>{
	pavlok.beep({
		'request': req
	});
	console.log('Beeped!');
	res.sendStatus(200)
});

app.get('/pattern', (req, res ) =>{
	pavlok.pattern({
		'request': req,
		'pattern': [ 'beep', 'vibrate', 'beep' ],
		'count': 2
	});
	res.sendStatus(200)
});

app.get('/logout', (req, res ) =>{
	pavlok.logout(req);
	result.redirect('/');	
});

app.get('/tts', (req, res) => {
    const { text } = req.query
    const request = {
        input: { ssml: generatessml(text) },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' }, //MALE NEUTRAL
        audioConfig: { audioEncoding: 'MP3' },
    };

    client.synthesizeSpeech(request).then(x => {
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(new Buffer(x[0].audioContent, 'binary'))
        // res.send(generatessml(text))
    });
})

app.get('/follow', (req, res) => {
    const { name } = req.query
    const request = {
        input: { ssml: generatefollowssml(name) },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' }, //MALE NEUTRAL
        audioConfig: { audioEncoding: 'MP3' },
    };

    client.synthesizeSpeech(request).then(x => {
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(new Buffer(x[0].audioContent, 'binary'))
        // res.send(generatessml(text))
    });
})

io.on('connection', function (socket) {
    twi.on('message', (channel, tags, message, self) => {
        
        if(message.toLowerCase().startsWith('!tip')) {
            twi.say("swelogan", `${tags['display-name']} -> https://streamlabs.com/swelogan/tip`);
        }

        if(message.toLowerCase().startsWith('!say')) {
            const text = message.replace('!say', '')
            const renderText =  twitchEmoji.parse( text , { emojiSize : 'medium' })
            socket.emit('play', {
                text,
                type: 'tts',
                renderText: renderText,
                user: tags['display-name'],
                color: tags.color,
                badges: tags.badges
            });
        }
        if(message.toLowerCase().startsWith('!play')) {
            const nr = message.replace('!play', '')
            socket.emit('play', {
                nr: nr.trim(),
                type: 'audio',
                renderText: '',
                user: tags['display-name'],
                color: tags.color,
                badges: tags.badges
            });
        }
    });
});

server.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))