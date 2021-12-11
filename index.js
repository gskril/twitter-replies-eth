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
			const addressesInReplies = []
			await getReplies(tweet.data[0].conversation_id, addressesInReplies, 1)
		})
		.catch((err) => console.log(err))
}
	
// Get replies to tweet with conversation id (1800 replies/15 minutes rate limit)
async function getReplies(conversationId, addressesInReplies, page, next) {
	await client.v2
		.get('tweets/search/recent', {
			'query': `conversation_id: ${conversationId}`,
			'next_token': next,
		})
		.then(async (replies) => {
			replies.data.forEach((reply) => {
				// Split reply text by regex to see if it includes a 42 character address
				const ethAddressRegex = /0x[a-fA-F0-9]{40}/
				const ethAddress = reply.text.match(ethAddressRegex)

				if (ethAddress) {
					addressesInReplies.push(ethAddress[0])
				} else if (reply.text.toLowerCase().match(/.+?(?=\.eth)/)) {
					// If there's no ETH address, check for ENS name
					const wordsInTweet = reply.text.toLowerCase().split(/\s|\\n/)
					const ensName = wordsInTweet.find(word => word.includes('.eth'))
					addressesInReplies.push(ensName)
				}
			})

			// Check if there are more replies to loop through
			if (replies.data.length > 0) {
				// Pause for 15 mins before rate limit is reached
				if (page % 180 === 0 && page !== 0) {
					console.log(`${addressesInReplies.length} addresses found so far. Pausing for 15 mins to avoid rate limit...`)
					await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
				}
				await getReplies(conversationId, addressesInReplies, page + 1, replies.meta.next_token)
			} else {
				// Output addressesInReplies array to file output.json
				const fs = require('fs')
				fs.writeFile('output.json', JSON.stringify(addressesInReplies), (err) => {
					if (err) throw err
					console.log(`The output.json file has been saved with ${addressesInReplies.length} addresses!`)
				})
			}
		})
}
