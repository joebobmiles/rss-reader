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
    "media:group": [ { "media:description": [ description] } ]
  }) =>
    ({
      title,
      link,
      description
    }),
  nytimes: ({
    title: [ title ],
    link: [ link ],
    description: [ description ]
  }) =>
    ({
      title,
      link,
      description
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
  const html = (await retrieveFeedsFrom(sources)).reduce(
    (entries, { type, data }) =>
      entries.concat(
        extract[type](data).map((entry) => normalize[type](entry))
      ),
    []
  ).reduce(
    (html, { title, link, description }) =>
      html + `<article><h2><a href='${link}'>${title}</a></h2><p>${description}</p></article>`,
    ""
  );

  response.send(`<html><body>${html}</body></html>`);
});

api.listen(8080, () => {
  console.info("Running...");
});