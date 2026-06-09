import json
import sqlite3

def import_rankings():
    # Connect to the database
    conn = sqlite3.connect('data/football.db')
    cursor = conn.cursor()

    # Read the scraped JSON
    with open('data/fifa_ranking.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Insert new teams if they don't exist, then update rank/points
    for entry in data:
        # First ensure the team exists in the table
        cursor.execute('''
            INSERT OR IGNORE INTO teams (name)
            VALUES (?)
        ''', (entry['team'],))
        
        # Then update the rank and points
        cursor.execute('''
            UPDATE teams 
            SET rank = ?, points = ? 
            WHERE name = ?
        ''', (entry['rank'], entry['points'], entry['team']))

    conn.commit()
    conn.close()
    print(f"Successfully updated {len(data)} teams with FIFA rankings in 'teams' table.")

if __name__ == "__main__":
    import_rankings()
