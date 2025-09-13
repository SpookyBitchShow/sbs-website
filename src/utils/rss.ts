export interface Episode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration: string;
  audioUrl: string;
  category: string;
  imageUrl?: string;
  guid: string;
}

export interface PodcastFeed {
  title: string;
  description: string;
  episodes: Episode[];
}

// Category mapping based on iTunes image URL
function determineCategory(itunesImageUrl: string): string {
  if (!itunesImageUrl) {
    return 'true story'; // Default fallback
  }
  
  const imageUrl = itunesImageUrl.toLowerCase();
  
  if (imageUrl.includes('halloween')) {
    return 'halloween';
  }
  if (imageUrl.includes('true_crime') || imageUrl.includes('truecrime')) {
    return 'true crime';
  }
  if (imageUrl.includes('paranormal')) {
    return 'paranormal';
  }
  if (imageUrl.includes('mystic')) {
    return 'mystic';
  }
  if (imageUrl.includes('creature')) {
    return 'creature';
  }
  if (imageUrl.includes('filmreview') || imageUrl.includes('film_review')) {
    return 'filmreview';
  }
  if (imageUrl.includes('creepypasta')) {
    return 'creepypasta';
  }
  if (imageUrl.includes('news')) {
    return 'news';
  }
  if (imageUrl.includes('true_story') || imageUrl.includes('truestory')) {
    return 'true story';
  }
  
  // Default fallback
  return 'true story';
}

// Parse duration from various formats
function parseDuration(durationStr: string): string {
  if (!durationStr) return '0:00';
  
  // Handle formats like "01:23:45", "1:23:45", "23:45", etc.
  const parts = durationStr.trim().split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return durationStr;
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

// Extract items from XML text using regex (server-side)
function extractItemsFromXML(xmlText: string): string[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const items: string[] = [];
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    items.push(match[1]);
  }
  
  return items;
}

// Parse individual episode item (server-side)
function parseEpisodeItem(itemXML: string, index: number, totalItems: number): Episode {
  const extractValue = (tag: string, xml: string): string => {
    // Try CDATA first
    const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 'is');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1];
    
    // Try regular tag
    const regularRegex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is');
    const regularMatch = xml.match(regularRegex);
    return regularMatch ? regularMatch[1] : '';
  };
  
  const extractAttribute = (tag: string, attribute: string, xml: string): string => {
    const regex = new RegExp(`<${tag}[^>]*${attribute}=["'](.*?)["'][^>]*>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  };
  
  const title = extractValue('title', itemXML) || 'Untitled Episode';
  const description = extractValue('description', itemXML); // Keep HTML for rich formatting
  const pubDate = extractValue('pubDate', itemXML);
  const guid = extractValue('guid', itemXML) || `episode-${index + 1}`;
  
  // Extract duration from itunes:duration or duration
  let duration = extractValue('itunes:duration', itemXML) || extractValue('duration', itemXML);
  duration = parseDuration(duration);
  
  // Extract audio URL from enclosure
  const audioUrl = extractAttribute('enclosure', 'url', itemXML);
  
  // Extract iTunes image URL
  const itunesImageUrl = extractAttribute('itunes:image', 'href', itemXML);
  
  // Extract episode number from title
  const episodeMatch = title.match(/#(\d+)/);
  const episodeNumber = episodeMatch ? episodeMatch[1] : String(totalItems - index);
  
  return {
    id: episodeNumber,
    title,
    description,
    pubDate: formatDate(pubDate),
    duration,
    audioUrl,
    category: determineCategory(itunesImageUrl),
    imageUrl: '',
    guid
  };
}

export async function fetchPodcastFeed(): Promise<PodcastFeed> {
  try {
    const response = await fetch('https://0666sbs.podcaster.de/spooky-bitch-show.rss');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log('RSS feed fetched successfully, length:', xmlText.length);
    
    // Use a simple XML parser for Node.js environment
    // Parse XML manually since DOMParser isn't available server-side
    let xmlDoc: any;
    
    // Try to use DOMParser if available (client-side)
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    } else {
      // Server-side parsing - use a simple regex-based approach for now
      const items = extractItemsFromXML(xmlText);
      const channelTitle = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                          xmlText.match(/<title>(.*?)<\/title>/)?.[1] || 
                          'Spooky Bitch Show';
      
      return {
        title: channelTitle.replace('Spooky Bitch Show', 'Spooky Bitch Show'),
        description: 'Der Grusel und Mystery Podcast',
        episodes: items.map((item, index) => parseEpisodeItem(item, index, items.length))
      };
    }
    
    // Extract channel info
    const channel = xmlDoc.querySelector('channel');
    const title = channel?.querySelector('title')?.textContent || 'Spooky Bitch Show';
    const description = channel?.querySelector('description')?.textContent || '';
    
    // Extract episodes
    const items = Array.from(xmlDoc.querySelectorAll('item'));
    const episodes: Episode[] = items.map((item, index) => {
      const guid = item.querySelector('guid')?.textContent || `episode-${index + 1}`;
      const title = item.querySelector('title')?.textContent || 'Untitled Episode';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const durationElement = item.querySelector('itunes\\:duration, duration');
      const duration = parseDuration(durationElement?.textContent || '');
      const enclosure = item.querySelector('enclosure');
      const audioUrl = enclosure?.getAttribute('url') || '';
      const imageElement = item.querySelector('itunes\\:image, image');
      const imageUrl = imageElement?.getAttribute('href') || imageElement?.getAttribute('url') || '';
      
      // Extract episode number from title if available
      const episodeMatch = title.match(/#(\d+)/);
      const episodeNumber = episodeMatch ? episodeMatch[1] : String(items.length - index);
      
      return {
        id: episodeNumber,
        title,
        description: description,
        pubDate: formatDate(pubDate),
        duration,
        audioUrl,
        category: determineCategory(imageUrl),
        imageUrl,
        guid
      };
    });
    
    return {
      title,
      description,
      episodes: episodes.sort((a, b) => parseInt(b.id) - parseInt(a.id)) // Sort by episode number descending
    };
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    
    // Return fallback data if RSS fetch fails
    return {
      title: 'Spooky Bitch Show',
      description: 'Der Grusel und Mystery Podcast',
      episodes: []
    };
  }
}

// Get latest episodes (for homepage)
export async function getLatestEpisodes(count: number = 2): Promise<Episode[]> {
  const feed = await fetchPodcastFeed();
  return feed.episodes.slice(0, count);
}

// Get all episodes (for alle-folgen page)
export async function getAllEpisodes(): Promise<Episode[]> {
  const feed = await fetchPodcastFeed();
  return feed.episodes;
}

// Get episodes by category
export async function getEpisodesByCategory(category: string): Promise<Episode[]> {
  const feed = await fetchPodcastFeed();
  return feed.episodes.filter(episode => episode.category === category);
}

// Get single episode by ID
export async function getEpisodeById(id: string): Promise<Episode | null> {
  const feed = await fetchPodcastFeed();
  return feed.episodes.find(episode => episode.id === id) || null;
}