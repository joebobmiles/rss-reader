import express from 'express'
import xml2js from 'xml2js'
import fetch from 'node-fetch'

const api = express()

const getDomain = (url: string) => {
  const domain = url.match(/^https?:\/\/(.+\.[a-z]+)\//)
  return (domain != null) && domain[1]
}

const processFeed =
{
  youtube: {
    extract: ({ feed: { entry } }: any) => entry,
    normalize: (
      {
        title: [title],
        link: [{ $: { href: link } }],
        published: [published]
      }: any,
      options: any
    ) =>
      ({
        title,
        link,
        description: null,
        date: new Date(published)
      })
  },
  rss: {
    extract: ({ rss: { channel: [{ item }] } }: any) => item,
    normalize: (
      {
        title: [title],
        link: [link],
        description: [description] = [null],
        pubDate,
        category: categories = []
      }: any,
      {
        includeDescription
      }: any
    ) =>
      ({
        title,
        link,
        description: (includeDescription ? description : null),
        date: new Date(pubDate),
        categories
      })
  },
  atom: {
    extract: ({ feed: { entry } }: any) => entry,
    normalize: (
      {
        title: [title],
        link,
        summary,
        updated: [updated]
      }: any,
      {
        includeDescription
      }: any
    ) => ({
      title: title instanceof Object ? title._ : title,
      link: link[0].$.href,
      description: (includeDescription && summary > 0 ? summary[0]._ : null),
      date: new Date(updated)
    })
  }
}

const fetchDataFrom = async (url: string) =>
  await fetch(url)
    .then(async (response) => await response.text())
    .then(async (text) =>
      await new xml2js.Parser().parseStringPromise(text))
    .catch(() => {
      console.error(`Could not load: ${url}`)
      return {}
    })

const defaultOptions =
{
  type: 'rss',
  includeDescription: true
}

const parseUrlOrConfig = (urlOrConfig: string | any) =>
  ({
    ...defaultOptions,
    ...(
      typeof (urlOrConfig) === 'string'
        ? {
            url: urlOrConfig
          }
        : {
            ...urlOrConfig
          }
    )
  })

const retrieveFeedsFrom = async (sources: any) =>
  await Promise.all(
    sources
      .reduce(
        (feeds: any, urlOrConfig: any) => {
          const {
            url,
            ...config
          } = parseUrlOrConfig(urlOrConfig)

          return feeds.concat(
            fetchDataFrom(url)
              .then((data) =>
                ({
                  url,
                  config,
                  data
                }))
          )
        },
        []
      )
  )

api.get('/', (request, response) => {
  void retrieveFeedsFrom([
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'
  ])
    .then(
      (feeds) =>
        feeds
          .filter(
            ({ data, config: { type } }: any) =>
              data != null &&
        (
          {
            rss: data.rss !== undefined,
            atom: data.feed !== undefined
          }[type as string]
        )
          )
          .reduce(
            (entries: any, { url, config: { type, ...options }, data }: any) =>
              entries.concat(
                processFeed[type as 'youtube' | 'rss' | 'atom'].extract(data)
                  .map((entry: any) => ({
                    domain: getDomain(url),
                    ...processFeed[type as 'youtube' | 'rss' | 'atom'].normalize(entry, options)
                  })
                  )
                  .filter(
                    ({ categories }: any) =>
                      options.categories && categories
                        ? categories.some(
                          (category: any) => options.categories.includes(category)
                        )
                        : true
                  )
              ),
            []
          )
          .reduce(
            (entries: any, entry: any) =>
              entries.some(({ link }: any) => link === entry.link) === false
                ? entries.concat(entry)
                : entries,
            []
          )
          .filter(
            ({ date }: any) =>
              ((Date.now() - date) / (1000 * 60 * 60)) <= 24
          )
          .sort(
            ({ date: date1 }: any, { date: date2 }: any) =>
              date2.valueOf() - date1.valueOf()
          ))
    .then((entries) => response.json(entries))
})

const PORT = process.env.PORT ?? 8080

api.listen(PORT, () => {
  console.info(`Running on port ${PORT}`)
})
