import urllib.request
import re
import json

req = urllib.request.Request('https://inside.fifa.com/fifa-world-ranking/men?dateId=FRS_Male_Football_20260119', headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
    if m:
        data = json.loads(m.group(1))
        # Traverse JSON to find rankings
        print("Found __NEXT_DATA__ length:", len(m.group(1)))
        
        # Look for rankingData or similar
        try:
            page_props = data['props']['pageProps']
            with open("scratch_props.json", "w", encoding="utf-8") as f:
                json.dump(page_props, f, indent=2)
            print("Wrote page props to scratch_props.json")
        except KeyError:
            print("No pageProps")
    else:
        print("Not found")
except Exception as e:
    print("Error:", e)
