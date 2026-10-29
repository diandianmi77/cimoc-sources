/** @type {import('./_venera_.js')} */
/**
 * MangaNel —— 由 Cimoc 源 MangaNel.java 转换
 * 站点：https://manganelo.com
 */
class MangaNel extends ComicSource {
  name = "MangaNel"
  key = "manganel"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/manganel.js"

  get baseUrl() {
    return "https://manganelo.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/story/${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".search-story-item")) {
        const a = div.querySelector("h3 > a")
        if (!a) continue
        const cid = (a.attributes["href"] || "").replace(`${this.baseUrl}/manga/`, "")
        const img = div.querySelector("img")
        const time = div.querySelector("span.text-nowrap.item-time")
        const author = div.querySelector("span.text-nowrap.item-author")
        comics.push(
          new Comic({
            id: cid,
            title: img ? img.attributes["alt"] || "" : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: author ? author.text : "",
            description: time ? time.text.replace("Updated :", "").trim() : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manga/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const imgEl = doc.querySelector(".info-image > img")
      const updateEl = doc.querySelector("div.story-info-right-extent > p > span.stre-value")
      const authorEl = doc.querySelector(
        "table.variations-tableInfo > tbody > tr:nth-child(2) > td.table-value > a"
      )
      const statusRow = doc.querySelector(
        "table.variations-tableInfo > tbody > tr:nth-child(3) > td.table-value > a"
      )
      const introEl = doc.querySelector("#panel-story-info-description")
      const statusText = statusRow ? statusRow.text : ""
      const finished =
        statusText.includes("Completed") || /completed/i.test(statusText)

      const chapters = {}
      for (const li of doc.querySelectorAll(".row-content-chapter > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"]
        if (href) chapters[this.abs(href)] = a.text
      }

      return new ComicDetails({
        title: imgEl ? imgEl.attributes["title"] || "" : "",
        cover: imgEl ? this.abs(imgEl.attributes["src"]) : "",
        description: introEl ? introEl.text.replace("Description :", "") : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(this.abs(epId), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const images = []
      for (const img of doc.querySelectorAll("div.container-chapter-reader > img")) {
        const src = img.attributes["src"]
        if (src) images.push(this.abs(src))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
