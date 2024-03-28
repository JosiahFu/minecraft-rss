import { Feed } from 'feed';

const URI = 'https://example.com'
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0';

const RECENT_COUNT = 10;

type VersionType = 'release' | 'snapshot' | 'old_alpha' | 'old_beta';

interface VersionManifest {
    latest: {
        /** Corresponds to an id */
        release: string,
        /** Corresponds to an id */
        snapshot: string,
    },
    versions: {
        id: string,
        type: VersionType,
        url: string,
        /** ISO 8601 format */
        time: string,
        /** ISO 8601 format */
        releaseTime: string,
    }[]
}

interface Tile {
    sub_header: string;
    image: {
        content_type: 'image';
        imageURL: string;
        alt: string;
    };
    tile_size: `${number}x${number}`;
    title: string;
}

interface Article {
    default_tile: Tile;
    preferred_tile?: Tile;
    articleLang: 'en-us';
    primary_category: string;
    categories: string[];
    article_url: string;
    publish_date: string;
    tags: string[];
}

interface Articles {
    article_count: number;
    article_grid: Article[]
}

type VersionData = {
    type: 'release' | 'snapshot';
    id: string;
} | {
    type: 'pre' | 'rc';
    release: string;
    number: number;
};

function extractType(id: string, type: VersionType): VersionData {
    if (type === 'release')
        return {type: 'release', id}

    const preMatch = /(.+)-pre(\d+)/.exec(id);
    if (preMatch !== null) {
        const [_, releaseVersion, preReleaseNumber] = preMatch;
        
        return {type: 'pre', number: parseInt(preReleaseNumber), release: releaseVersion};
    }

    const rcMatch = /(.+)-rc(\d+)/.exec(id);
    if (rcMatch !== null) {
        const [_, releaseVersion, releaseCandidateNummber] = rcMatch;
        
        return {type: 'rc', number: parseInt(releaseCandidateNummber), release: releaseVersion};
    }
    
    return {type: 'snapshot', id};
}

const articleRoot = '/en-us/article/'
function findArticle(data: VersionData, articles: Article[]): Article | undefined {
    switch(data.type) {
        case 'release':
        case 'snapshot':
            return articles.find(({article_url}) => article_url === `${articleRoot}minecraft-${data.type === 'release' ? 'java-edition' : 'snapshot'}-${data.id.replaceAll('.', '-')}`);

        case 'pre':
        case 'rc':
            console.warn(`Trying to find article for ${data.release}-${data.type}${data.number}`)

            let number = data.number;
            let link: string;
            
            while (number > 0) {
                link = `${articleRoot}minecraft-${data.release.replaceAll('.', '-')}-${data.type === 'pre' ? 'pre-release' : 'release-candidate'}-${number}`;
                
                console.warn(`Trying ${link}`)
                
                const result = articles.find(({article_url}) => article_url === link);

                if (result !== undefined) {
                    console.warn(`Found ${link}`);
                    return result;
                }
                
                number--;
            }
            
            return undefined;
    }
}

function fixOrigin(relativeURI: string): string {
    return `https://minecraft.net${relativeURI}`
}

export async function generateRss() {
    console.warn('Fetching version manifest...')

    const versionManifest: VersionManifest = await (await fetch('https://piston-meta.mojang.com/mc/game/version_manifest.json')).json()

    console.warn('Fetched version manifest')

    const recent = versionManifest.versions.slice(0, RECENT_COUNT);
    
    console.warn('Fetching all articles...')

    const {article_grid: articles}: Articles = await (await fetch('https://www.minecraft.net/content/minecraft-net/_jcr_content.articles.grid/content/minecraft-net/_jcr_content.articles.grid?pageSize=2000&tagsPath=minecraft:stockholm/news', {headers: {'User-Agent': USER_AGENT}})).json()

    console.warn('Fetched all articles');

    const feed = new Feed({
        copyright: 'Public Domain',
        id: URI,
        link: URI,
        title: 'Minecraft Updates',
        favicon: 'https://minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/favicon.ico',    
    })

    for (let {id, type, releaseTime} of recent) {
        const article = findArticle(extractType(id, type), articles);
        
        const url = article && fixOrigin(article.article_url);
        
        feed.addItem({
            date: new Date(releaseTime),
            link: url ?? '',
            title: id,
            id: url,
            image: article && fixOrigin((article.preferred_tile ?? article.default_tile).image.imageURL),
        })
    }

    console.warn('All versions added')

    return feed;
}
