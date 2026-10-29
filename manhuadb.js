/** @type {import('./_venera_.js')} */
/**
 * 漫画DB —— 由 Cimoc 源 ManHuaDB.java 转换
 * 原站：https://www.manhuadb.com
 * 图片清单是 base64 JSON：host + img_pre + item.img
 */
class ManHuaDB extends ComicSource {
  name = "漫画DB"
  key = "manhuadb"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/manhuadb.js"

  get baseUrl() {
    return "https://www.manhuadb.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl,
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
      const res = await Network.get(`${this.baseUrl}/search?q=${encodeURIComponent(keyword)}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const a of doc.querySelectorAll("a.d-block")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const img = a.querySelector("img")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.attributes["title"] || "",
            cover: img ? this.abs(img.attributes["data-original"] || img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("h1.comic-title")
      const coverEl = doc.querySelector("td.comic-cover > img")
      const authorEl = doc.querySelector("a.comic-creator")
      const introEl = doc.querySelector("p.comic_story")
      const statusEl = doc.querySelector("a.comic-pub-state")
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")
      const endEl = doc.querySelector("a.comic-pub-end-date")
      const dateEl = doc.querySelector("a.comic-pub-date")

      const chapters = {}
      for (const a of doc.querySelectorAll("#comic-book-list > div > ol > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) chapters[path] = a.attributes["title"] || a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: endEl && endEl.text ? endEl.text : dateEl ? dateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const hostM = html.match(/data-host="(.*?)"/)
      const preM = html.match(/data-img_pre="(.*?)"/)
      const dataM = html.match(/var img_data = '(.*?)';/)
      if (!hostM || !dataM) throw "未找到图片数据"

      const jsonStr = Convert.decodeUtf8(Convert.decodeBase64(dataM[1]))
      const list = JSON.parse(jsonStr)
      const pre = preM ? preM[1] : ""
      return { images: list.map((it) => hostM[1] + pre + it.img) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
