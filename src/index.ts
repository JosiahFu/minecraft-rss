import { generateRss } from './feed.js';
import fs from 'fs';
import sirv from 'sirv';
import polka from 'polka';

const PORT = process.env.PORT ?? 3000;

try {
    fs.mkdirSync('static');
} catch (e) {

}

async function updateFeed() {
    const feed = await generateRss();
    fs.writeFileSync('static/feed.atom', feed.atom1())
    fs.writeFileSync('static/feed.rss', feed.rss2())
}

await updateFeed();
const interval = setInterval(updateFeed, 15 * 60 * 1000);

const server = polka()
    .use(sirv('static'))
    .listen(PORT, (err: Error | undefined) => {
        if (err) throw err;
        console.log(`> Ready on localhost:${PORT}`);
        console.log('> Use Ctrl+C to stop');
    });
    
const handleExit = () => {
    console.log('\n> Closing server!')

    clearInterval(interval);
    server.server?.close();
}

process.on('SIGTERM', handleExit);
process.on('SIGINT', handleExit);
