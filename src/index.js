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

const process =
{
  "www.youtube.com": {
    extract: ({ feed: { entry }}) => entry,
    normalize: ({
      title: [ title ],
      link: [ { $: { href: link } } ],
      published: [ published ],
      ...extra
    }) =>
      ({
        title,
        link,
        description: "",
        date: new Date(published),
        extra
      }),
  },
  "rss.nytimes.com": {
    extract: ({ rss: { channel: [ { item } ] } }) => item,
    normalize: ({
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
  }
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

api.get("/", async (request, response) =>
{
  const feeds = (await retrieveFeedsFrom(sources));

  const entries = feeds
    .reduce(
      (entries, { url, data }) =>
        entries.concat(
          process[getType(url)].extract(data)
            .map((entry) => process[getType(url)].normalize(entry))
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

  response.send(
    `<html>`+
      `<head><title>Hullabaloo</title></head>`+
      `<body>${html}</body>`+
    `</html>`
  );
});

api.listen(8080, () => {
  console.info("Running...");
});