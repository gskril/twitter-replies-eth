# Twitter Reply Scraper

Get Ethereum addresses and ENS (.eth) names from Twitter replies.

Example of where this can be useful: https://twitter.com/BoredElonMusk/status/1613688001535803392

## How to use

1. Install dependencies with `npm install`
2. Configure the [Twitter API](https://developer.twitter.com/en) in `.env`
3. Enter the URL of the tweet you want to scrape the replies of on line 5 of `index.js`
4. Start with `npm start`

## Things to note

- The Twitter API has a rate limit of 180 requests per 15-minute window and shows 10 replies per page. We'll play it safe and do 160 requests, so after pagination that comes to 1600 replies scraped until the script will sleep for 15 minutes.
- If the specified tweet has less than 1600 replies, this should take less than a minute.
- The Twitter API will only return replies from the last 7 days.
