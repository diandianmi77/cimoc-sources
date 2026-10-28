/** @type {import('./_venera_.js')} */
/**
 * Mangakakalot —— 由 Cimoc 源 Mangakakalot.java 转换
 * 站点：https://mangakakalot.com（同一源也兼容 manganelo 域名，做了分支）
 * 注意：这里的漫画 id 就是详情页完整 URL。
 */
class Mangakakalot extends ComicSource {
  name = "Mangakakalot"
  key = "mangakakalot"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/mangakakalot.js"

  get baseUrl() {
    return "https://mangakakalot.com"
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
      for (const div of doc.querySelectorAll(".story_item")) {
        const a = div.querySelector("a")
        if (!a) continue
        const img = div.querySelector("img")
        const spans = div.querySelectorAll("div.story_item_right > span")
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: img ? img.attributes["alt"] || "" : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: spans[3] ? spans[3].text.replace("Author(s) :", "").trim() : "",
            description: spans[4] ? spans[4].text.replace("Updated :", "").trim() : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(this.abs(id), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const isKakalot = id.includes("mangakakalot")

      let title = ""
      let cover = ""
      let update = ""
      let author = ""
      let intro = ""
      let finished = false

      if (isKakalot) {
        const img = doc.querySelector(".manga-info-pic > img")
        title = img ? img.attributes["alt"] || "" : ""
        cover = img ? this.abs(img.attributes["src"]) : ""
        const info = doc.querySelectorAll(".manga-info-text > *")
        update = info[3] ? info[3].text.replace("Last updated :", "").trim() : ""
        author = info[4] ? info[4].text.replace("Author(s) :", "").trim() : ""
        const introEl = doc.querySelector("#noidungm")
        intro = introEl ? introEl.text : ""
        const st = info[2] ? info[2].text : ""
        finished = st.includes("Completed") || st.includes("完结")
      } else {
        const img = doc.querySelector(".info-image > img")
        title = img ? img.attributes["alt"] || img.attributes["title"] || "" : ""
        cover = img ? this.abs(img.attributes["src"]) : ""
        const u = doc.querySelector("div.story-info-right-extent > p > span.stre-value")
        update = u ? u.text : ""
        const a = doc.querySelector(
          "table.variations-tableInfo > tbody > tr:nth-child(2) > td.table-value > a"
        )
        author = a ? a.text : ""
        const d = doc.querySelector("#panel-story-info-description")
        intro = d ? d.text.replace("Description :", "") : ""
        const st = doc.querySelector(
          "table.variations-tableInfo > tbody > tr:nth-child(3) > td.table-value > a"
        )
        finished = st ? st.text.includes("Completed") : false
      }

      const chapters = {}
      const sel = isKakalot ? ".chapter-list > div" : ".row-content-chapter > li"
      for (const el of doc.querySelectorAll(sel)) {
        const a = el.querySelector(isKakalot ? "span > a" : "a")
        if (!a) continue
        const href = a.attributes["href"]
        if (href) chapters[this.abs(href)] = a.text
      }

      return new ComicDetails({
        title,
        cover,
        description: intro,
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const sel = comicId.includes("mangakakalot")
        ? "div#vungdoc > img"
        : "div.container-chapter-reader > img"
      const images = []
      for (const img of doc.querySelectorAll(sel)) {
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
