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

const articleRoot = 'https://www.minecraft.net/en-us/article/'
async function findArticle(data: VersionData): Promise<string | undefined> {
    switch(data.type) {
        case 'release':
        case 'snapshot':
            return `${articleRoot}minecraft-${data.type === 'release' ? 'java-edition' : 'snapshot'}-${data.id.replaceAll('.', '-')}`;

        case 'pre':
        case 'rc':
            console.warn(`Trying to find article for ${data.release}-${data.type}${data.number}`)

            let number = data.number;
            let link;
            
            while (number > 0) {
                link = `${articleRoot}minecraft-${data.release.replaceAll('.', '-')}-${data.type === 'pre' ? 'pre-release' : 'release-candidate'}-${number}`;
                
                console.warn(`Trying ${link}`)
                
                const result = await fetch(link, {headers: {
                    'User-Agent': USER_AGENT,
                }});
                
                if (result.ok) {
                    console.warn(`Found ${link}`);
                    return link;
                }
                
                number--;
            }
            
            return undefined;
    }
}

export async function generateRss() {
    console.warn('Fetching version manifest...')

    const versionManifest: VersionManifest = await (await fetch('https://piston-meta.mojang.com/mc/game/version_manifest.json')).json()

    console.warn('Fetched version manifest')

    const recent = versionManifest.versions.slice(0, RECENT_COUNT);

    const feed = new Feed({
        copyright: 'Public Domain',
        id: URI,
        link: URI,
        title: 'Minecraft Updates',
        favicon: 'https://minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/favicon.ico',    
    })

    for (let {id, type, releaseTime} of recent) {
        const article = await findArticle(extractType(id, type));
        
        feed.addItem({
            date: new Date(releaseTime),
            link: article ?? '',
            title: id,
            id: article,
        })
    }

    console.warn('All versions added')

    return feed;
}
