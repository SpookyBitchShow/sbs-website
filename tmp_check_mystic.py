import urllib.request
import re
from html import unescape

url = 'https://0666sbs.podcaster.de/spooky-bitch-show.rss'
text = urllib.request.urlopen(url).read().decode('utf-8', errors='ignore')
items = re.findall(r'<item>([\s\S]*?)</item>', text)
print('items', len(items))

cnt = {}

def add(k):
    cnt[k] = cnt.get(k, 0) + 1


def determine_category(image_url, title=''):
    image_url = image_url.lower()
    if 'halloween' in image_url:
        return 'halloween'
    if 'true_crime' in image_url or 'truecrime' in image_url:
        return 'true crime'
    if 'paranormal' in image_url:
        return 'paranormal'
    if 'mystic' in image_url:
        return 'mystic'
    if 'creature' in image_url:
        return 'creature'
    if 'filmreview' in image_url or 'film_review' in image_url:
        return 'filmreview'
    if 'creepypasta' in image_url or 'horror' in image_url:
        return 'horror'
    if 'news' in image_url:
        return 'news'
    if any(x in image_url for x in ['spookylivereport', 'spooky_live', 'spooky-live', 'spooky%20live', 'livereport', 'live-report', 'live_report', 'spookylive']) or ('spooky' in image_url and 'live' in image_url):
        return 'spookylivereport'
    if 'true_story' in image_url or 'truestory' in image_url:
        return 'true story'
    title = title.lower()
    if any(x in title for x in ['spooky live', 'spooky live report', 'live report', 'livereport']) or ('spooky' in title and 'live' in title):
        return 'spookylivereport'
    if 'creepypasta' in title or 'horror' in title:
        return 'horror'
    if 'project_everest' in image_url or 'everest' in image_url:
        return 'projecteverest'
    return 'true story'

for item in items:
    title_match = re.search(r'<title>(.*?)</title>', item, re.S)
    title = unescape(title_match.group(1).strip()) if title_match else ''
    image_match = re.search(r'<itunes:image[^>]*href=["\'](.*?)["\']', item, re.I)
    image = image_match.group(1) if image_match else ''
    category = determine_category(image, title)
    if category == 'mystic':
        print('MYSTIC', title, image)
    add(category)

print(cnt)
