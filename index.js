require('dotenv').config()
const { TwitterApi } = require('twitter-api-v2')

// ========================= SET TWEET URL HERE ========================= \\ 
const tweetUrl = ''
// ====================================================================== \\

const client = new TwitterApi({
	appKey: process.env.CONSUMER_KEY,
	appSecret: process.env.CONSUMER_SECRET,
	accessToken: process.env.ACCESS_TOKEN,
	accessSecret: process.env.ACCESS_TOKEN_SECRET,
})

// Authenticate client
;(async() => {
	await client.appLogin()
		.catch((err) => {
			console.log(err.data.errors)
			process.exit()
		})

	const tweetId = tweetUrl.split('status/')[1]
	getTweet(tweetId)
})()

// Get conversation id from the tweet
async function getTweet(tweetId) {
	await client.v2
		.get('tweets', {
			'ids': tweetId,
			'tweet.fields': 'author_id,conversation_id',
		})
		.then(async (tweet) => {
			let users = []
			await getReplies(tweet.data[0].conversation_id, users, 1)
		})
		.catch((err) => console.log(err))
}
	
// Get replies to tweet with conversation id (1800 replies/15 minutes rate limit)
async function getReplies(conversationId, users, page, next) {
	await client.v2
		.get('tweets/search/recent', {
			'query': `conversation_id: ${conversationId}`,
			'expansions': 'author_id',
			'next_token': next,
		})
		.then(async (replies) => {
			if (replies.meta.result_count === 0) {
				return console.log ('No replies found in the last 7 days')
			}

			replies.data.forEach((reply) => {
				users.push(reply.author_id)
			})

			// Check if there are more replies to loop through
			if (replies.data.length === 10) {
				// Pause for 15 mins before rate limit is reached
				if (page % 180 === 0 && page !== 0) {
					console.log(`${users.length} replies scraped so far. Pausing for 15 mins to avoid rate limit...`)
					await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000))
				}
				await getReplies(conversationId, users, page + 1, replies.meta.next_token)
			} else {
				// Remove duplicates addresses
				users = [...new Set(users)]
				const fs = require('fs')

				// Make 'output' directory if it doesn't exist
				if (!fs.existsSync('./output')) {
					fs.mkdirSync('./output')
				}

				fs.writeFile('./output/replies.json', JSON.stringify(users), (err) => {
					if (err) throw err
					console.log(`${users.length} profile ids saved to output/replies.json`)
				})
			}
		})
}
