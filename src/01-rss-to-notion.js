const dotenv = require("dotenv");
const Parser = require("rss-parser");

const feedItemIds = new Set();

const main = async () => {
  let isFirstRun = true;

  const parser = new Parser();
  const settings = getSettings();

  while (true) {
    const feed = await parser.parseURL(settings.rssFeedUrl);

    if (isFirstRun) {
      console.log(`[INFO] feed title: ${feed.title}`);
      console.log(`[INFO] feed url: ${settings.rssFeedUrl}`);
    }

    for (const feedItem of feed.items) {
      const feedItemId = feedItem.id || feedItem.guid || feedItem.link;

      if (!feedItemIds.has(feedItemId)) {
        feedItemIds.add(feedItemId);
        const feedItemShortTitle = feedItem.title?.slice(0, 48);
        const feedItemShortLink = feedItem.link?.slice(0, 32)?.trim();
        console.log(`[INFO] add ${feedItemShortTitle} (${feedItemShortLink})`);
      }
    }

    isFirstRun = false;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
};

const getSettings = () => {
  dotenv.config();

  const rssFeedUrl = process.env.RSS_FEED_URL;
  if (!rssFeedUrl) {
    throw new Error("Environment variable is missing: RSS_FEED_URL");
  }

  return { rssFeedUrl };
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
