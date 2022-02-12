const path = require("path");
const express = require("express");
const xml2js = require("xml2js");
const fetch = require("node-fetch");

const api = express();

const sources = require("./sources.json");

const getDomain = (url) =>
{
  const domain = url.match(/^https?:\/\/(.+\.[a-z]+)\//);
  return domain && domain[1];
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
        pubDate,
        category: categories
      },
      {
        includeDescription
      }
    ) =>
      ({
        title,
        link,
        description: (includeDescription ? description : null),
        date: new Date(pubDate),
        categories
      })
  },
  "atom": {
    extract: ({ feed: { entry } }) => entry,
    normalize: (
      {
        title: [ title ],
        link: [ { $: { href: link } } ],
        summary: [ { _: description } ],
        updated: [ updated ]
      },
      {
        includeDescription
      }
    ) =>
      ({
        title: title instanceof Object ? title['_'] : title,
        link,
        description: (includeDescription ? description : null),
        date: new Date(updated)
      })
  }
};

const fetchDataFrom = (url) =>
  fetch(url)
    .then((response) => response.text())
    .then((text) =>
      new xml2js.Parser().parseStringPromise(text))
    .catch(() =>
    {
      console.error(`Could not load: ${url}`);
      return {};
    });

const defaultOptions =
{
  type: "rss",
  includeDescription: true,
};

const parseUrlOrConfig = (urlOrConfig) =>
  ({
    ...defaultOptions,
    ...(
      typeof(urlOrConfig) === "string"
      ? {
        url: urlOrConfig
      }
      : {
        ...urlOrConfig,
      }
    )
  });

const retrieveFeedsFrom = (sources) =>
  Promise.all(
    sources
    .reduce(
      (feeds, urlOrConfig) =>
      {
        const {
          url,
          ...config
        } = parseUrlOrConfig(urlOrConfig);

        return feeds.concat(
          fetchDataFrom(url)
          .then((data) =>
          ({
            url,
            config,
            data
          }))
        );
      },
      []
    )
  );

api.use("/static", express.static(path.join(__dirname, "static")));

api.get("/", async (request, response) =>
{
  const feeds = (await retrieveFeedsFrom(sources));

  const entries = feeds
    .filter(
      ({ data, config: { type } }) =>
        (
          {
            rss: data.rss !== undefined,
            atom: data.feed !== undefined,
          }[type]
        )
    )
    .reduce(
      (entries, { url, config: { type, ...options }, data }) =>
        entries.concat(
          processFeed[type].extract(data)
            .map((entry) =>
              ({
                domain: getDomain(url),
                ...processFeed[type].normalize(entry, options)
              })
            )
            .filter(
              ({ categories }) =>
                options.categories && categories
                ? categories.some(
                  (category) => options.categories.includes(category)
                )
                : true
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

  response.json(entries)
});

const PORT = process.env.PORT || 8080;
api.listen(PORT, () => {
  console.info(`Running on port ${PORT}`);
});