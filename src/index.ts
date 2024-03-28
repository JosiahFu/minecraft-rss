import { generateRss } from './feed.js';
import fs from 'fs';
import sirv from 'sirv';
import polka from 'polka';

try {
    fs.mkdirSync('static');
} catch (e) {

}

async function updateFeed() {
    const feed = await generateRss();
    fs.writeFile('static/feed.atom', feed.atom1(), () => {})
    fs.writeFile('static/feed.rss', feed.rss2(), () => {})
}

await updateFeed();
const timeout = setTimeout(updateFeed, 15 * 60 * 1000);

const server = polka()
    .use(sirv('static'))
    .listen(3000, (err: Error | undefined) => {
        if (err) throw err;
        console.log('> Ready on localhost:3000');
    });
    
const handleExit = () => {
    console.log('> Closing server!')

    clearTimeout(timeout);
    server.server?.close();
}

process.on('SIGTERM', handleExit);
process.on('SIGINT', handleExit);
