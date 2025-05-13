#!/usr/bin/env node

const chalk = require('chalk');
const https = require('https');


function urlGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 && res.headers.location) {
                return resolve(urlGet(res.headers.location));
            }
            if (res.statusCode !== 200) {
                return reject(new Error('status code ' + res.statusCode));
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk });
            res.on('end', () => resolve(data) );
            res.on('error', () => reject(new Error('failed')));
        })
    });
}


function decodeHtmlEntities(str) {
    return str.replace(/&#(\d+);|&#x([A-Fa-f0-9]+);/g, (_, dec, hex) => {
        if (dec) { return String.fromCharCode(parseInt(dec, 10)); }
        else if (hex) { return String.fromCharCode(parseInt(hex, 16)); }
        else { return _; }
    });
}


function getRecentlyPlayedGameName() {
    const FALLBACK_RESPONSE = 'Video games!';
    return urlGet('https://backloggd-api.vercel.app/user/dalelane')
        .then((data) => {
            try {
                return JSON.parse(data).content.recentlyPlayed[0].name;
            }
            catch {
                return FALLBACK_RESPONSE;
            }
        })
        .catch(() => {
            return FALLBACK_RESPONSE;
        });
}


function getRecentlyReadBookName() {
    const FALLBACK_RESPONSE = 'Books!';
    return urlGet('https://www.goodreads.com/user/show/1370155-dale-lane')
        .then((data) => {
            try {
                const metaTagRegex = /<meta\s+name=["']description["']\s+content=["'](.*?)["']\s*\/?>/i;
                const match = data.match(metaTagRegex);
                if (match && match[1]) {
                    const prefix = 'currently reading ';
                    let content = match[1];
                    let index = content.toLowerCase().indexOf(prefix);
                    if (index !== -1) {
                        return content.substring(index + prefix.length);
                    }
                    else {
                        return content;
                    }
                }
            }
            catch {}
            return FALLBACK_RESPONSE;
        })
        .catch(() => {
            return FALLBACK_RESPONSE;
        });
}


function getRecentlyListenedSongName() {
    const FALLBACK_RESPONSE = 'Music!';
    return urlGet('https://badges.lastfm.workers.dev/last-played?user=dalelane')
        .then((data) => {
            try {
                const tagRegex = /<title>(.*?)<\/title>/;
                const match = data.match(tagRegex);
                if (match && match[1]) {
                    const prefix = 'last played: ';
                    let content = match[1];
                    let index = content.toLowerCase().indexOf(prefix);
                    if (index !== -1) {
                        return content.substring(index + prefix.length);
                    }
                    else {
                        return content;
                    }
                }
            }
            catch {}
            return FALLBACK_RESPONSE;
        })
        .catch(() => {
            return FALLBACK_RESPONSE;
        });
}


function getRecentBlueskyPost() {
    const FALLBACK_RESPONSE = 'Something interesting';
    return urlGet('https://bsky.app/profile/did:plc:mecl54mdisxz3xv5da7yxr53/rss')
        .then((data) => {
            try {
                const itemMatch = data.match(/<item>[\s\S]*?<\/item>/);
                if (!itemMatch) {
                    return FALLBACK_RESPONSE;
                }
                const descriptionMatch = itemMatch[0].match(/<description>([\s\S]*?)<\/description>/);
                if (!descriptionMatch) {
                    return FALLBACK_RESPONSE;
                }
                return decodeHtmlEntities(descriptionMatch[1]);
                }
            catch {
                return FALLBACK_RESPONSE;
            }
        })
        .catch(() => {
            return FALLBACK_RESPONSE;
        });
}


// Card dimensions - fixed width for better alignment
const WIDTH = 72;
const PADDING = 5;
const LINELENGTH = WIDTH - PADDING;

function truncate(str) {
    if (str.length > LINELENGTH) {
        return str.substring(0, LINELENGTH) + '…';
    }
    return str;
}

function wrap(str) {
    const MAXLINES = 2;
    const result = [];
    let remaining = str.trim().replaceAll('\n', '');

    while (remaining.length > 0 && result.length < MAXLINES) {
        if (remaining.length <= LINELENGTH) {
            result.push(remaining);
            break;
        }
        let splitAt = remaining.lastIndexOf(' ', LINELENGTH);
        if (splitAt === -1) {
            splitAt = LINELENGTH;
        }
        let part = remaining.slice(0, splitAt).trim();
        result.push(part);

        remaining = remaining.slice(splitAt).trim();
    }

    if (remaining.length > 0) {
        result.push('…');
    }
    return result;
}


// Define colors and styles
const primary = chalk.hex('#654FF0');
const secondary = chalk.hex('#4FF0B5');
const subtle = chalk.hex('#AFB7C0');
const headings = chalk.hex('#F04F89');
const highlight = primary.bold;

// Create borders with exact width
const topBorder = primary('╭' + '─'.repeat(WIDTH) + '╮');
const bottomBorder = primary('╰' + '─'.repeat(WIDTH) + '╯');

// Function to create a line with perfectly aligned borders
const createLine = (text) => {
  // Strip ANSI codes for accurate length calculation
  const cleanText = text.replace(/\u001b\[\d+(;\d+)*m/g, '');
  const padding = WIDTH - cleanText.length;
  return primary('│') + text + ' '.repeat(padding) + primary('│');
};

// Empty line and divider
const emptyLine = createLine(' '.repeat(WIDTH));
const divider = createLine(' ' + subtle('━'.repeat(WIDTH - 2)) + ' ');
const thindivider = createLine(' ' + subtle('-'.repeat(WIDTH - 2)) + ' ');


Promise.all([
    getRecentlyReadBookName(),
    getRecentlyPlayedGameName(),
    getRecentlyListenedSongName(),
    getRecentBlueskyPost()
])
.then(([ recentlyRead, recentlyPlayed, recentlyListened, recentlySaid ]) => {
    const card = [
        '',
        topBorder,
        emptyLine,
        createLine(' ' + highlight('dale lane')),
        divider,
        emptyLine,
        createLine(' ' + '🏢' + '  ' + headings('Work') + '    :: ' + chalk.white('Chief Architect @ IBM')),
        createLine(' ' + '🦋' + '  ' + headings('Bluesky') + ' :: ' + chalk.white('@dalelane.co.uk')),
        createLine(' ' + '📬' + '  ' + headings('Email') + '   :: ' + chalk.greenBright.underline('email@dalelane.co.uk')),
        createLine(' ' + '🌐' + '  ' + headings('Web') + '     :: ' + chalk.greenBright.underline('https://dalelane.co.uk')),
        emptyLine,
        thindivider,
        createLine(' ' + '📖' + ' ' + headings('Reading')),
        createLine(' ' + '  ' + truncate(recentlyRead)),
        createLine(' ' + '🎮' + ' ' + headings('Playing')),
        createLine(' ' + '  ' + truncate(recentlyPlayed)),
        createLine(' ' + '🎹' + ' ' + headings('Listening')),
        createLine(' ' + '  ' + truncate(recentlyListened)),
        createLine(' ' + '🤐' + ' ' + headings('Saying')),
        wrap(recentlySaid).map(l => createLine('   ' + l)).join('\n'),
        divider,
        createLine(' ' + subtle('>') + ' ' + subtle('Run') + ' ' + secondary('npx dalelane') + ' ' + subtle('anytime to see this card')),
        bottomBorder,
        ''
    ].join('\n');

    console.log(card);
});