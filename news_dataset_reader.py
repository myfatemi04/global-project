import bs4
import requests
from functools import lru_cache
import json
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

print(list(categories))


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
def get_stories(company_name: str, verbose: bool = False):
    company_name = 'Amazon'

    relevant_stories_with_sentiment = []
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
            relevant_stories_with_sentiment.append(
                (polarity, subjectivity, story))

    relevant_stories_with_sentiment = list(
        sorted(relevant_stories_with_sentiment, key=lambda x: x[0]))

    return relevant_stories_with_sentiment


if __name__ == "__main__":
    company_name = 'Amazon'

    relevant_stories_with_sentiment = get_stories(company_name)

    print("Number of", company_name, "stories:",
          len(relevant_stories_with_sentiment))

    print("3 most negative stories:")
    for polarity, subjectivity, story in relevant_stories_with_sentiment[:3]:
        print("Polarity:", polarity, "Subjectivity:", subjectivity)
        print_story(story)

    print('3 most positive stories:')
    for polarity, subjectivity, story in relevant_stories_with_sentiment[-3:]:
        print("Polarity:", polarity, "Subjectivity:", subjectivity)
        print_story(story)


def make_huffpost_request(url):
    response = requests.get(url)
    soup = bs4.BeautifulSoup(response.text, 'html.parser')
    return soup


def get_huffpost_article_content(url):
    soup = make_huffpost_request(url)

    entry_body = soup.find(id='entry-body')
    paragraphs = entry_body.select('.primary-cli.cli-text > p')

    article_text = '\n\n'.join([p.text for p in paragraphs])

    return article_text


content = get_huffpost_article_content(
    'https://www.huffingtonpost.com/entry/amazon-strike-christmas_us_5bb2ff3fe4b0480ca660d538')

print(content)
