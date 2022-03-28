import threading
from collections import deque
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


queue = deque(pairings)
num_completed = 0


def thread_loop():
    global num_completed

    while queue:
        short_name, long_name = queue.popleft()
        filename = f"./data/{short_name}.csv"

        if os.path.exists(filename):
            num_completed += 1
            continue

        csv_response = requests.get(
            f'https://violationtracker.goodjobsfirst.org/prog.php?parent={short_name}&detail=csv_results', headers={
                'User-Agent': 'Chrome'
            })

        text = csv_response.text
        with open(filename, "w") as f:
            f.write(text)

        num_completed += 1
        print(f"{num_completed} / {len(pairings)} - {long_name}, {len(text)=}...")


n_threads = 25
threads = [threading.Thread(target=thread_loop) for _ in range(n_threads)]

for thread in threads:
    thread.start()

for thread in threads:
    thread.join()

exit()

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
