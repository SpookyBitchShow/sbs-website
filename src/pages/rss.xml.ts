import { fetchPodcastFeed } from '../utils/rss.ts';

export async function getStaticPaths() {
  return [
    { params: {} }
  ];
}

export async function GET() {
  try {
    // Fetch the original RSS feed
    const response = await fetch('https://0666sbs.podcaster.de/spooky-bitch-show.rss');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const originalXml = await response.text();
    
    // Get our parsed episode data to map IDs
    const feed = await fetchPodcastFeed();
    
    // Create a map of episode titles/guids to our episode slugs
    const episodeMap = new Map();
    feed.episodes.forEach(episode => {
      episodeMap.set(episode.guid, episode.slug);
      episodeMap.set(episode.title, episode.slug);
    });
    
    // Base URL for your site - hardcoded since we can't access request at build time
    // You should replace this with your actual domain
    const baseUrl = 'https://your-domain.github.io';
    
    // Replace links in the RSS XML
    let modifiedXml = originalXml;
    
    // Replace item links using regex
    modifiedXml = modifiedXml.replace(
      /<item>([\s\S]*?)<\/item>/g,
      (_, itemContent) => {
        // Extract guid and title from this item
        const guidMatch = itemContent.match(/<guid[^>]*>(.*?)<\/guid>/);
        const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        
        const guid = guidMatch ? guidMatch[1] : '';
        const title = titleMatch ? titleMatch[1] : '';
        
        // Find episode slug
        let episodeSlug = episodeMap.get(guid) || episodeMap.get(title);
        
        if (!episodeSlug) {
          // Try to generate slug from title as fallback
          episodeSlug = title
            .toLowerCase()
            .replace(/[äöüß]/g, (match) => {
              const replacements = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
              return replacements[match] || match;
            })
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        }
        
        if (episodeSlug) {
          const episodeUrl = `${baseUrl.replace(/\/$/, '')}/episode/${episodeSlug}`;
          
          // Replace or add link tag
          if (itemContent.includes('<link>')) {
            itemContent = itemContent.replace(
              /<link>(.*?)<\/link>/,
              `<link>${episodeUrl}</link>`
            );
          } else {
            // Add link after title
            itemContent = itemContent.replace(
              /(<title>.*?<\/title>)/,
              `$1\n    <link>${episodeUrl}</link>`
            );
          }
        }
        
        return `<item>${itemContent}</item>`;
      }
    );
    
    return new Response(modifiedXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8'
      }
    });
    
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Spooky Bitch Show</title>
    <description>Error loading RSS feed</description>
    <link>https://your-domain.github.io</link>
  </channel>
</rss>`, {
      status: 500,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8'
      }
    });
  }
};