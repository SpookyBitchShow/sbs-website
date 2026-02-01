export interface Episode {
  id: string;
  title: string;
  slug: string;
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

// Generate URL-friendly slug from episode title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => {
      const replacements: Record<string, string> = {
        'ä': 'ae',
        'ö': 'oe', 
        'ü': 'ue',
        'ß': 'ss'
      };
      return replacements[match] || match;
    })
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
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
    if (imageUrl.includes('spookylivereport') || imageUrl.includes('livereport')) {
    return 'spookylivereport';
  }
    if (imageUrl.includes('project_everest') || imageUrl.includes('everest')) {
    return 'projecteverest';
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

// Parse description and add CSS classes to specific German sentences
function enrichDescription(description: string): string {
  if (!description) return description;
  
  const patterns = [
    {
      pattern: /Quellenrecherche und Soundeffekte:/g,
      className: 'episode-credits'
    },
    {
      pattern: /Empfehlung der Folge:/g,
      className: 'episode-recommendation'
    },
    {
      pattern: /So erreicht ihr uns:/g,
      className: 'episode-contact'
    },
    {
      pattern: /Hast du selbst eine Geschichte, die dir bis heute\s+Gänsehaut bereitet\? Dann schick sie uns!/g,
      className: 'episode-submission-call rounded-lg p-2 text-center'
    },
    {
      pattern: /Unseren Linktree findet ihr hier/g,
      className: 'episode-linktree'
    }
  ];
  
  let enrichedDescription = description;
  
  patterns.forEach(({ pattern, className }) => {
    enrichedDescription = enrichedDescription.replace(pattern, (match) => {
      if (className.includes('episode-submission-call')) {
        return `<div class="${className}">${match}</div>`;
      }
      return `<span class="${className}">${match}</span>`;
    });
  });
  
  return enrichedDescription;
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
  const rawDescription = extractValue('description', itemXML); // Keep HTML for rich formatting
  const description = enrichDescription(rawDescription);
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
    slug: generateSlug(title),
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
    const episodes: Episode[] = items.map((item: Element, index) => {
      const guid = item.querySelector('guid')?.textContent || `episode-${index + 1}`;
      const title = item.querySelector('title')?.textContent || 'Untitled Episode';
      const rawDescription = item.querySelector('description')?.textContent || '';
      const description = enrichDescription(rawDescription);
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
        slug: generateSlug(title),
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

// Get single episode by slug
export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const feed = await fetchPodcastFeed();
  return feed.episodes.find(episode => episode.slug === slug) || null;
}
