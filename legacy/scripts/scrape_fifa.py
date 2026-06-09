import time
import json
from playwright.sync_api import sync_playwright

def scrape_fifa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to FIFA ranking page...")
        page.goto("https://inside.fifa.com/fifa-world-ranking/men?dateId=FRS_Male_Football_20260119", timeout=60000)
        
        print("Waiting for page load...")
        page.wait_for_load_state("domcontentloaded", timeout=60000)
        time.sleep(5)
        
        # Accept cookies if the button exists to prevent it from blocking clicks
        try:
            page.locator("button#onetrust-accept-btn-handler").click(timeout=3000)
            print("Accepted cookies.")
        except:
            pass

        # Try to click "Show full ranking" or similar button
        try:
            # The button text is usually "Show full rankings" or "View all"
            btn = page.locator("button:has-text('Show full ranking')")
            if btn.count() > 0:
                btn.first.click()
                print("Clicked 'Show full ranking' button")
                time.sleep(2)
        except Exception as e:
            print("No 'Show full ranking' button found or error clicking:", e)

        print("Scrolling down to load all teams...")
        # Scroll down in increments to trigger lazy loading
        last_height = page.evaluate("document.body.scrollHeight")
        while True:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1.5)
            new_height = page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                # Try a little bit more in case of slow network
                time.sleep(3)
                new_height = page.evaluate("document.body.scrollHeight")
                if new_height == last_height:
                    break
            last_height = new_height
        
        print("Extracting data...")
        # Now extract the rows
        # The table is a standard HTML table in most cases, or a div grid.
        # Inside.fifa uses a table structure with tbody tr
        rows = page.locator("tbody tr").all()
        print(f"Found {len(rows)} rows.")
        
        rankings = []
        for row in rows:
            text = row.inner_text().strip().split('\n')
            # Text is usually: Rank, Country Code, Country Name, Points
            # Or similar. We will just parse the text.
            # E.g., ['1', 'FRA', 'France', '1877.32', ...]
            # The rank is usually the first element.
            if len(text) >= 3:
                try:
                    rank_str = text[0].strip()
                    # Some rows might have "up", "down" indicators, so points might be the last or second to last.
                    # Team name is usually the longest string or after the rank.
                    # We can use javascript evaluation on the row to be safe.
                    pass
                except:
                    continue
                    
        # Better approach: evaluate a JS script in the page context that extracts the data directly from the DOM
        js_extract = r"""
        () => {
            const rows = document.querySelectorAll('tbody tr');
            const data = [];
            rows.forEach((r, i) => {
                const cells = Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
                if (cells.length >= 6) {
                    let rankStr = cells[0].split('\n')[0].replace(/[^0-9]/g, '');
                    let rank = parseInt(rankStr);
                    let teamName = cells[1].trim();
                    let ptsStr = cells[5].replace(/[^0-9.]/g, '');
                    let points = parseFloat(ptsStr);
                    
                    if (!isNaN(rank) && teamName && !isNaN(points)) {
                        data.push({rank: rank, team: teamName, points: points});
                    }
                }
            });
            return {data: data};
        }
        """
        
        result = page.evaluate(js_extract)
        extracted_data = result['data']
        print(f"Extracted {len(extracted_data)} valid team entries.")
        
        with open("data/all_fifa_rankings.json", "w", encoding="utf-8") as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False)
            
        browser.close()

if __name__ == "__main__":
    scrape_fifa()
