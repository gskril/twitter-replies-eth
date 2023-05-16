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
;(async () => {
  await client
    .appLogin()
    .then(() => console.log('Client authenticated'))
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
      ids: tweetId,
      'tweet.fields': 'author_id,conversation_id',
    })
    .then(async (tweet) => {
      let ensNames = []
      let ethAddresses = []
      let allAddresses = []
      await getReplies(
        tweet.data[0].conversation_id,
        ensNames,
        ethAddresses,
        allAddresses,
        1
      )
    })
    .catch((err) => console.log(err))
}

// Get replies to tweet with conversation id (1800 replies/15 minutes rate limit)
async function getReplies(
  conversationId,
  ensNames,
  ethAddresses,
  allAddresses,
  page,
  next
) {
  await client.v2
    .get('tweets/search/recent', {
      query: `conversation_id: ${conversationId}`,
      next_token: next,
      max_results: 100,
    })
    .then(async (replies) => {
      if (replies.meta.result_count === 0) {
        return console.log('No replies found in the last 7 days')
      }

      replies.data.forEach((reply) => {
        // Split reply text by regex to see if it includes a 42 character address
        const ethAddressRegex = /0x[a-fA-F0-9]{40}/
        const ethAddress = reply.text.match(ethAddressRegex)

        if (ethAddress) {
          ethAddresses.push(ethAddress[0])
          allAddresses.push(ethAddress[0])
        } else if (reply.text.toLowerCase().match(/.+?(?=\.eth)/)) {
          // If there's no ETH address, check for ENS name
          const wordsInTweet = reply.text.toLowerCase().split(/\s|\\n/)
          const ensName = wordsInTweet.find((word) => word.includes('.eth'))
          ensNames.push(ensName)
          allAddresses.push(ensName)
        }
      })

      // Check if there are more replies to loop through
      if (replies.meta.result_count === 100) {
        // Pause for 15 mins before rate limit is reached
        if (page % 160 === 0 && page !== 0) {
          console.log(
            `${allAddresses.length} addresses found so far. Pausing for 15 mins to avoid rate limit...`
          )
          await new Promise((resolve) => setTimeout(resolve, 15 * 60 * 1000))
        } else {
          console.log(`${allAddresses.length} addresses found`)
        }
        await getReplies(
          conversationId,
          ensNames,
          ethAddresses,
          allAddresses,
          page + 1,
          replies.meta.next_token
        )
      } else {
        // Remove duplicates addresses
        ensNames = [...new Set(ensNames)]
        ethAddresses = [...new Set(ethAddresses)]
        allAddresses = [...new Set(allAddresses)]
        const fs = require('fs')

        // Make 'output' directory if it doesn't exist
        if (!fs.existsSync('./output')) {
          fs.mkdirSync('./output')
        }

        fs.writeFile(
          './output/ensNames.json',
          JSON.stringify(ensNames),
          (err) => {
            if (err) throw err
            console.log(
              `${ensNames.length} ENS names saved to output/ensNames.json`
            )
          }
        )

        fs.writeFile(
          './output/ethAddresses.json',
          JSON.stringify(ethAddresses),
          (err) => {
            if (err) throw err
            console.log(
              `${ethAddresses.length} ETH addresses saved to output/ethAddresses.json`
            )
          }
        )

        fs.writeFile(
          './output/allAddresses.json',
          JSON.stringify(allAddresses),
          (err) => {
            if (err) throw err
            console.log(
              `${allAddresses.length} total addresses saved to output/allAddresses.json`
            )
          }
        )
      }
    })
}
