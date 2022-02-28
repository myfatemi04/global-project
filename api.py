import re
import requests

request = requests.get(
    'https://www.amazon.com/Camera-Vimtag-Storage-Monitor-Security/dp/B09HKD63XB/', headers={'User-Agent': 'Chrome'})


matches = re.match(f'Visit the (.+) store', request.text)

print(matches)
