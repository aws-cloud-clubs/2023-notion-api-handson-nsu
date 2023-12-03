const dotenv = require("dotenv");
const Notion = require("@notionhq/client");
const Parser = require("rss-parser");

const main = async () => {
  let isFirstRun = true;
  let feedItemIds = new Set();

  const parser = new Parser();
  const settings = getSettings();
  const notion = new Notion.Client({ auth: settings.notionToken });

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

        const response = await notion.databases.query({
          database_id: settings.notionDatabaseId,
          filter: {
            and: [{ property: "Id", rich_text: { equals: feedItemId } }],
          },
        });

        if (response.results.length) {
          console.log(
            `[INFO] duplicate found ${feedItemShortTitle} (${feedItemShortLink})`
          );
          continue;
        }

        feedItemIds.add(feedItemId);
        console.log(`[INFO] add ${feedItemShortTitle} (${feedItemShortLink})`);

        await notion.pages.create({
          parent: {
            database_id: settings.notionDatabaseId,
            type: "database_id",
          },
          properties: {
            Title: {
              type: "title",
              title: [{ type: "text", text: { content: feedItem.title } }],
            },
            Link: { type: "url", url: feedItem.link },
            Id: {
              type: "rich_text",
              rich_text: [{ type: "text", text: { content: feedItemId } }],
            },
          },
        });
      }
    }

    isFirstRun = false;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
};

const getSettings = () => {
  dotenv.config();

  const notionToken = process.env.NOTION_TOKEN;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;
  const rssFeedUrl = process.env.RSS_FEED_URL;

  if (!notionToken) {
    throw new Error("Environment variable is missing: NOTION_TOKEN");
  }

  if (!notionDatabaseId) {
    throw new Error("Environment variable is missing: NOTION_DATABASE_ID");
  }

  if (!rssFeedUrl) {
    throw new Error("Environment variable is missing: RSS_FEED_URL");
  }

  return { notionToken, notionDatabaseId, rssFeedUrl };
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
