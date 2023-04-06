import Head from 'next/head'
import * as React from 'react'

const getFeed = async () =>
  await fetch('http://localhost:43115').then(async (r) => await r.json())

const App = () => {
  const [feed, setFeed] = React.useState([])

  React.useEffect(
    () => {
      void getFeed().then((feed) => setFeed(feed))
    },
    []
  )

  return (
    <>
      <Head>
        <title>Hullabaloo</title>
      </Head>

      <header>
        <h1>Hullabaloo <small>v0.0.1</small></h1>
      </header>

      <main>
        {
          feed.length === 0
            ? <h1>LOADING...</h1>
            : (
                feed.map((entry, index) => (
                  <article key={index}>
                    <aside>
                      <time
                        dateTime={entry.date}
                      >
                        {
                          new Date(entry.date).toLocaleString(
                            undefined,
                            {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            }
                          )
                        }
                      </time>
                      <p>
                        Via <a href={entry.link}>{entry.domain}</a>
                      </p>
                    </aside>
                    <section>
                      <h2><a href={entry.link}>{entry.title}</a></h2>
                      <div dangerouslySetInnerHTML={{ __html: entry.description }} />
                    </section>
                  </article>
                ))
              )
        }
      </main>
    </>
  )
}

export default App
