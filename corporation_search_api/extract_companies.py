import bs4
import requests
import os

with open("./all_selects.html", "r") as f:
    text = f.read()

soup = bs4.BeautifulSoup(text, 'html.parser')

pairings = []

for option in soup.find_all('option'):
    if 'value' in option.attrs and len(option.attrs['value']) > 0:
        short_name = option.attrs['value']
        long_name = option.text
        pairings.append((short_name, long_name))

print(len(pairings))

# https://violationtracker.goodjobsfirst.org/prog.php?parent=amazoncom&detail=csv_results
for short_name, long_name in pairings:
    filename = f"./data/{short_name}.csv"

    if os.path.exists(filename):
        continue

    csv_response = requests.get(
        f'https://violationtracker.goodjobsfirst.org/prog.php?parent={short_name}&detail=csv_results', headers={
            'User-Agent': 'Chrome'
        })

    text = csv_response.text
    with open(filename, "w") as f:
        f.write(text)

    print(f"Saved {long_name}, {len(text)=}...")
