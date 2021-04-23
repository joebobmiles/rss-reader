const path = require("path");
const express = require("express");
const xml2js = require("xml2js");
const fetch = require("node-fetch");

const api = express();

const sources = require("./sources.json");

const getType = (url) =>
{
  const type = url.match(/^https?:\/\/(.+\.[a-z]+)\//);
  return type && type[1];
}

const substackFeed =
{
  extract: ({ rss: { channel: [ { item } ] } }) => item,
  normalize: ({
    title: [ title ],
    link: [ link ],
    description: [ description ],
    pubDate: [ date ]
  }) =>
    ({
      title,
      link,
      description,
      date: new Date(date),
    }),
};

const processFeed =
{
  "www.youtube.com": {
    extract: ({ feed: { entry }}) => entry,
    normalize: ({
      title: [ title ],
      link: [ { $: { href: link } } ],
      published: [ published ]
    }) =>
      ({
        title,
        link,
        description: null,
        date: new Date(published)
      }),
  },
  "rss.nytimes.com": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
      title: [ title ],
      link: [ link ],
      description: [ description ],
      pubDate
    }) =>
      ({
        title,
        link,
        description,
        date: new Date(pubDate)
      })
  },
  "www.theguardian.com": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
      title: [ title ],
      link: [ link ],
      description: [ description ],
      pubDate: [ date ]
    }) =>
      ({
        title,
        link,
        description,
        date: new Date(date),
      }),
  },
  "hnrss.org": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
      title: [ title ],
      link: [ link ],
      pubDate: [ date ]
    }) =>
      ({
        title,
        link,
        description: null,
        date: new Date(date),
      }),
  },
  "lobste.rs": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
      title: [ title ],
      link: [ link ],
      pubDate: [ date ]
    }) =>
      ({
        title,
        link,
        description: null,
        date: new Date(date),
      }),
  },
  "greenwald.substack.com": substackFeed,
  "subconscious.substack.com": substackFeed,
  "noahpinion.substack.com": substackFeed,
  "residentcontrarian.substack.com": substackFeed,
  "littlefutures.substack.com": substackFeed,
  "codeforscience.org": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
      title: [ title ],
      link: [ link ],
      description: [ description ],
      pubDate: [ date ]
    }) =>
      ({
        title,
        link,
        description,
        date: new Date(date),
      }),
  },
};

const retrieveFeedsFrom = (sources) =>
  Promise.all(
    sources
    .reduce(
      (feeds, url) =>
        feeds.concat(
          fetch(url)
            .then((response) => response.text())
            .then((text) => new xml2js.Parser().parseStringPromise(text))
            .then((data) => ({ url, data }))
        ),
      []
    )
  );

api.use("/static", express.static(path.join(__dirname, "static")));

api.get("/", async (request, response) =>
{
  const feeds = (await retrieveFeedsFrom(sources));

  const entries = feeds
    .filter(
      ({ data }) => data.rss !== undefined
    )
    .reduce(
      (entries, { url, data }) =>
        entries.concat(
          processFeed[getType(url)].extract(data)
            .map((entry) => processFeed[getType(url)].normalize(entry))
        ),
      []
    )
    .reduce(
      (entries, entry) =>
        entries.some(({ link }) => link === entry.link) === false
        ? entries.concat(entry)
        : entries,
      []
    )
    .filter(
      ({ date }) =>
        ((Date.now() - date) / (1000 * 60 * 60)) <= 24
    )
    .sort(
      ({ date: date1 }, { date: date2 }) =>
        date2.valueOf() - date1.valueOf()
    );

  const html = entries
    .reduce(
      (html, { title, link, description, date }) =>
        html +
        `<article>`+
          `<h2><a href='${link}'>${title}</a></h2>`+
          `<time datetime='${date.toISOString()}'>${date.toLocaleString("en-US", {
            dateStyle: "short",
            timeStyle: "short"
          })}</time>`+
          (description ? `<p>${description}</p>` : "")+
        `</article>`,
      ""
    );

  response.send(
    `<html>`+
      `<head>`+
        `<link rel="stylesheet" type="text/css" href="static/css/reset.css">`+
        `<link rel="stylesheet" type="text/css" href="static/css/style.css">`+
        `<title>Hullabaloo</title>`+
      `</head>`+
      `<body>`+
        `<div id="site-container">`+
          `<header><h1>Hullabaloo</h1></header>`+
          `<main>${html}</main>`+
        `</div>`+
      `</body>`+
    `</html>`
  );
});

api.listen(process.env.PORT || 8080, () => {
  console.info("Running...");
});