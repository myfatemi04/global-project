import json
import os
from functools import lru_cache
import time

import bs4
import requests
import textblob

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

    return subjectivity, polarity


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

        if company_name in story['headline']:
            subjectivity, polarity = get_sentiment(story['short_description'])
            results.append((polarity, subjectivity, story))

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

    previous_line_length = 0
    for i, (polarity, subjectivity, story) in enumerate(stories):
        link = story['link']
        line = f'{i + 1} / {len(stories)} Downloading article body for {link}'
        print(line + ' ' * max(0, previous_line_length - len(line)))
        previous_line_length = len(line)

        try:
            get_huffpost_article_body(link)
        except Exception as e:
            print("Error:", e)
            errors.append((story, e))

    print()

    return errors


def main():
    company_name = 'Facebook'

    relevant_stories_with_sentiment = get_stories(company_name)
    relevant_stories_with_sentiment = sorted(
        relevant_stories_with_sentiment, key=lambda x: x[0])

    print("Number of", company_name, "stories:",
          len(relevant_stories_with_sentiment))

    get_huffpost_article_body(
        'https://www.huffingtonpost.com/entry/facebook-advertising-racism_us_58136a76e4b0390e69cfa6bf')

    errors = download_and_cache_stories(relevant_stories_with_sentiment)

    print(errors)

    # print("3 most negative stories:")
    # for polarity, subjectivity, story in relevant_stories_with_sentiment[:3]:
    #     print("Polarity:", polarity, "Subjectivity:", subjectivity)
    #     print_story(story)

    # print('3 most positive stories:')
    # for polarity, subjectivity, story in relevant_stories_with_sentiment[-3:]:
    #     print("Polarity:", polarity, "Subjectivity:", subjectivity)
    #     print_story(story)

    # if False:
    #     content = get_huffpost_article_body(
    #         'https://www.huffingtonpost.com/entry/amazon-strike-christmas_us_5bb2ff3fe4b0480ca660d538')

    #     print(content)


if __name__ == "__main__":
    main()
