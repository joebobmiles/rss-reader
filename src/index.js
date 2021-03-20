const express = require("express");
const xml2js = require("xml2js");
const fetch = require("node-fetch");

const api = express();

const sources =
[
  {
    type: "youtube",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC2wac-sRkNMPSFEnaOHCL3g",
  },
  {
    type: "nytimes",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml",
  }
];

const extract =
{
  youtube: ({ feed: { entry }}) => entry,
  nytimes: ({ rss: { channel: [ { item } ] } }) => item
};

const normalize =
{
  youtube: ({
    title: [ title ],
    link: [ { $: { href: link } } ],
    published: [ published ],
    "media:group": [ { "media:description": [ description] } ],
    ...extra
  }) =>
    ({
      title,
      link,
      description,
      date: new Date(published),
      extra
    }),
  nytimes: ({
    title: [ title ],
    link: [ link ],
    description: [ description ],
    pubDate,
    ...extra
  }) =>
    ({
      title,
      link,
      description,
      date: new Date(pubDate),
      extra
    })
};

const retrieveFeedsFrom = (sources) =>
  Promise.all(
    sources
    .reduce(
      (feeds, { type, url }) =>
        feeds.concat(
          fetch(url)
            .then((response) => response.text())
            .then((text) => new xml2js.Parser().parseStringPromise(text))
            .then((data) => ({ type, data }))
        ),
      []
    )
  );

api.get("/", async (request, response) =>
{
  const feeds = (await retrieveFeedsFrom(sources));

  const entries = feeds
    .reduce(
      (entries, { type, data }) =>
        entries.concat(
          extract[type](data).map((entry) => normalize[type](entry))
        ),
      []
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
          `<p>${description}</p>`+
        `</article>`,
      ""
    );

  response.send(`<html><body>${html}</body></html>`);
});

api.listen(8080, () => {
  console.info("Running...");
});