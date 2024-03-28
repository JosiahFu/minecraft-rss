import { generateRss } from './feed.js';
import fs from 'fs';


fs.mkdirSync('static');

async function updateFeed() {
    const feed = await generateRss();
    fs.writeFile('static/feed.atom', feed.atom1(), () => {})
    fs.writeFile('static/feed.rss', feed.rss2(), () => {})
}

updateFeed();
setTimeout(updateFeed, 15 * 60 * 1000);
