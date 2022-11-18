const getFeed = async () =>
  await fetch('http://localhost:43115').then(async (r) => await r.json())

const main = async () => {
  const feed = await getFeed().then((feed) => feed)

  const $main = document.getElementsByTagName('main')[0]
  feed.forEach((entry) => {
    const $article = document.createElement('article')

    const $aside = document.createElement('aside')
    const $publishTime = document.createElement('time')

    $publishTime.setAttribute('datetime', entry.date)
    $publishTime.innerText = new Date(entry.date).toLocaleString(
      undefined,
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    )

    const $publisher = document.createElement('p')
    const $publisherLink = document.createElement('a')

    $publisherLink.setAttribute('href', entry.link)
    $publisherLink.innerText = entry.domain

    $publisher.innerText = 'Via '
    $publisher.appendChild($publisherLink)

    $aside.appendChild($publishTime)
    $aside.appendChild($publisher)

    const $preview = document.createElement('section')
    const $previewTitle = document.createElement('h2')
    const $previewTitleLink = document.createElement('a')

    $previewTitleLink.setAttribute('href', entry.link)
    $previewTitleLink.innerText = entry.title

    $previewTitle.appendChild($previewTitleLink)
    $preview.appendChild($previewTitle)

    if (entry.description) {
      const $previewContent = document.createElement('p')
      $previewContent.innerHTML = entry.description
      $preview.appendChild($previewContent)
    }

    $article.appendChild($aside)
    $article.appendChild($preview)
    $main.appendChild($article)
  })
}

void main()
