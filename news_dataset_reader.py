import json
import os
import random
import time
from functools import lru_cache

import bs4
import requests
import textblob

# Corporate Problem API source
# https://violationtracker.goodjobsfirst.org/prog.php?parent=amazoncom&detail=csv_results

# News dataset source:
# https://www.kaggle.com/datasets/rmisra/news-category-dataset
with open("./News_Category_Dataset_v2.json", "r") as f:
    stories = [json.loads(line) for line in f.readlines()]

# Each story contains:
example_story = {
    "category": "CRIME",
    "headline": "There Were 2 Mass Shootings In Texas Last Week, But Only 1 On TV",
    "authors": "Melissa Jeltsen",
    "link": "https://www.huffingtonpost.com/entry/texas-amanda-painter-mass-shooting_us_5b081ab4e4b0802d69caad89",
    "short_description": "She left her husband. He killed their children. Just another day in America.",
    "date": "2018-05-26"
}

categories = set()
for story in stories:
    categories.add(story['category'])


def print_story(story):
    print("Category: {}".format(story["category"]))
    print("Headline: {}".format(story["headline"]))
    print("Authors: {}".format(story["authors"]))
    print("Link: {}".format(story["link"]))
    print("Short Description: {}".format(story["short_description"]))
    print("Date: {}".format(story["date"]))
    print("\n")


def get_sentiment(text):
    sentiment = textblob.TextBlob(text).sentiment
    subjectivity = sentiment.subjectivity
    polarity = sentiment.polarity

    return polarity, subjectivity


@lru_cache(maxsize=None)
def get_stories(company_name: str):
    # Setting the company_name to be empty will return all stories

    results = []
    for story in stories:
        if story['category'] in [
            'ENTERTAINMENT',
            'WELLNESS',
            'HEALTHY LIVING',
            'TRAVEL'
        ]:
            continue

        if story['category'] not in [
            'BUSINESS',
            'CRIME',
            'WORLD NEWS',
            'TECH',
            'MONEY',
            'POLITICS'
        ]:
            continue

        if company_name in story['headline'] or company_name in story['short_description']:
            results.append(story)

    return results


def make_huffpost_request(url):
    response = requests.get(url)
    soup = bs4.BeautifulSoup(response.text, 'html.parser')
    return soup


def get_huffpost_article_body(url):
    # All URLs in this dataset follow the format: 'https://www.huffingtonpost.com/entry/amazon-strike-christmas_us_5bb2ff3fe4b0480ca660d538'
    article_id = url.split('/')[-1]

    filename = f'./article_cache/{article_id}_body.txt'

    if not os.path.exists('./article_cache'):
        os.mkdir('./article_cache')
    elif os.path.isfile('./article_cache'):
        raise Exception("article_cache is not a directory")

    if os.path.exists(filename):
        with open(filename, 'r') as f:
            body = f.read()

        return body

    soup = make_huffpost_request(url)

    entry_body = soup.find(id='entry-body')
    if entry_body is None:
        raise Exception("No entry body found")

    paragraphs = entry_body.select('.primary-cli.cli-text > p')

    body = '\n\n'.join([p.text for p in paragraphs])

    with open(filename, 'w') as f:
        f.write(body)

    return body


def download_and_cache_stories(stories):
    errors = []

    def thread_loop():
        nonlocal total_stories_processed

        while stories_queue:
            story = stories_queue.popleft()
            try:
                print(
                    f"Processing {total_stories_processed + 1}/{len(stories)}")
                get_huffpost_article_body(story['link'])
                total_stories_processed += 1
            except Exception as e:
                print("Error:", e)
                errors.append((story, e))
                total_stories_processed += 1

    import threading
    from collections import deque

    n_threads = 25
    threads = [threading.Thread(target=thread_loop) for _ in range(n_threads)]
    total_stories_processed = 0

    stories_queue = deque(stories)

    for thread in threads:
        thread.start()

    for thread in threads:
        thread.join()

    # previous_line_length = 0
    # for i, story in enumerate(stories):
    #     link = story['link']
    #     line = f'{i + 1} / {len(stories)} retrieving: {link}'
    #     print(line + ' ' * max(0, previous_line_length - len(line)), end='\r')
    #     previous_line_length = len(line)

    #     try:
    #         get_huffpost_article_body(link)
    #     except Exception as e:
    #         print("Error:", e)
    #         errors.append((story, e))

    # print()

    return errors


def get_story_content_guarded(story):
    try:
        return get_huffpost_article_body(story)
    except Exception as e:
        return story['short_description']


def plot_polarity_and_sentiment(stories_with_sentiment):
    polarities = []
    subjectivities = []

    for (p, s), _, _ in stories_with_sentiment:
        polarities.append(p)
        subjectivities.append(s)

    import matplotlib.pyplot as plt

    plt.scatter(polarities, subjectivities)
    plt.xlabel("Polarity")
    plt.ylabel("Subjectivity")
    plt.xlim(-1, 1)
    plt.ylim(-1, 1)
    plt.show()


def main():
    company_name = 'Amazon'

    company_stories = get_stories(company_name)

    print("Number of", company_name, "stories:", len(company_stories))

    # _errors = download_and_cache_stories(company_stories)

    matching_stories = []

    keyword = 'political'

    print(keyword, "stories")
    for story in company_stories:
        if keyword in get_story_content_guarded(story).lower().split():
            matching_stories.append(story)

    for story in matching_stories[:3]:
        print_story(story)

    print("Found {} matching stories".format(len(matching_stories)))
    exit()

    stories_with_sentiment = list(map(lambda story: (get_sentiment(
        get_story_content_guarded(story)), random.random(), story), company_stories))

    stories_sorted_by_sentiment = list(sorted(stories_with_sentiment))

    print("3 most negative stories:")
    for (polarity, subjectivity), _, story in stories_sorted_by_sentiment[:3]:
        print("Polarity:", polarity, "Subjectivity:", subjectivity)
        print_story(story)

    print('3 most positive stories:')
    for (polarity, subjectivity), _, story in stories_sorted_by_sentiment[-3:]:
        print("Polarity:", polarity, "Subjectivity:", subjectivity)
        print_story(story)


if __name__ == "__main__":
    main()
