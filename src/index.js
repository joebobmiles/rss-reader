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
  const entries = (await retrieveFeedsFrom(sources)).reduce(
    (entries, { type, data }) =>
      entries.concat(
        extract[type](data).map((entry) => normalize[type](entry))
      ),
    []
  );

  response.send(entries);
});

api.listen(8080, () => {
  console.info("Running...");
});