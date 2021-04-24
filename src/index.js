const path = require("path");
const express = require("express");
const xml2js = require("xml2js");
const fetch = require("node-fetch");

const api = express();

const sources = require("./sources.json");

const domainToTypeMap =
{
  "rss.nytimes.com": "rss",
  "www.theguardian.com": "rss",
  "hnrss.org": "rss",
  "lobste.rs": "rss",
  "greenwald.substack.com": "rss",
  "subconscious.substack.com": "rss",
  "noahpinion.substack.com": "rss",
  "residentcontrarian.substack.com": "rss",
  "codeforscience.org": "rss",
  "littlefutures.substack.com": "rss",
  "arbesman.substack.com": "rss",
  "mattsclancy.substack.com": "rss",
};

const domainToOptionsMap =
{
  "rss.nytimes.com": { includeDescription: true, },
  "www.theguardian.com": { includeDescription: true, },
  "hnrss.org": { includeDescription: false, },
  "lobste.rs": { includeDescription: false, },
  "greenwald.substack.com": { includeDescription: true, },
  "subconscious.substack.com": { includeDescription: true, },
  "noahpinion.substack.com": { includeDescription: true, },
  "residentcontrarian.substack.com": { includeDescription: true, },
  "codeforscience.org": { includeDescription: true, },
  "littlefutures.substack.com": { includeDescription: true, },
  "arbesman.substack.com": { includeDescription: true, },
  "mattsclancy.substack.com": { includeDescription: true, },
}

const getDomain = (url) =>
{
  const domain = url.match(/^https?:\/\/(.+\.[a-z]+)\//);
  return domain && domain[1];
}

const getType = (url) =>
{
  return domainToTypeMap[getDomain(url)];
}

const processFeed =
{
  "youtube": {
    extract: ({ feed: { entry }}) => entry,
    normalize: (
      {
        title: [ title ],
        link: [ { $: { href: link } } ],
        published: [ published ]
      },
      options
    ) =>
      ({
        title,
        link,
        description: null,
        date: new Date(published)
      }),
  },
  "rss": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: (
      {
        title: [ title ],
        link: [ link ],
        description: [ description ],
        pubDate
      },
      {
        includeDescription
      }
    ) =>
      ({
        title,
        link,
        description: (includeDescription ? description : null),
        date: new Date(pubDate)
      })
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
            .map((entry) =>
            ({
              domain: getDomain(url),
              ...processFeed[getType(url)].normalize(
                entry,
                domainToOptionsMap[getDomain(url)]
              )
            })
            )
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
      (html, { title, link, description, date, domain }) =>
        html +
        `<article>`+
          `<aside>`+
            `<time datetime='${date.toISOString()}'>${date.toLocaleString("en-US", {
              dateStyle: "short",
              timeStyle: "short"
            })}</time>`+
            `<p>Via <a href="https://${domain}">${domain}</a></p>`+
          `</aside>`+
          `<section>`+
            `<h2><a href='${link}'>${title}</a></h2>`+
            (description ? `<p>${description}</p>` : "")+
          `</section>`+
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