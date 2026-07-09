import { getAllEpisodes } from '../../utils/rss.ts';

export async function get() {
  try {
    const episodes = await getAllEpisodes();
    return new Response(JSON.stringify({ episodes }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
