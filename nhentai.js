/** @type {import('./_venera_.js')} */
/**
 * NHentai —— 由 Cimoc 源 NHentai.java 转换
 * 原站：https://nhentai.net
 * 注意：该源在 Cimoc 里整段被注释，这里按注释里的实现还原。
 * 画廊即单章，图片直接从详情页缩略图拿（t.jpg -> .jpg）。
 */
class NHentai extends ComicSource {
  name = "NHentai"
  key = "nhentai"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/nhentai.js"

  get baseUrl() {
    return "https://nhentai.net"
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

  parseGallery(a) {
    const href = a.attributes["href"] || ""
    const parts = href.split("/")
    const cid = parts.length > 1 ? parts[1] : ""
    let title = a.querySelector("div.caption") ? a.querySelector("div.caption").text : ""
    const am = title.match(/\[(.*?)\]/)
    const author = am ? am[1] : ""
    title = title.replace(/\[.*?\]\s*/, "")
    const img = a.querySelector("img")
    return new Comic({
      id: cid,
      title,
      cover: img ? this.abs(img.attributes["src"]) : "",
      subTitle: author,
    })
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/?q=${encodeURIComponent(keyword)}&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const a of doc.querySelectorAll("#content > div.index-container > div > a")) {
        comics.push(this.parseGallery(a))
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/g/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#info > h1")
      const introEl = doc.querySelector("#info > h2")
      const artistEl = doc.querySelector("#tags > div > span > a[href^='/artist/']")
      const coverEl = doc.querySelector("#cover > a > img")

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": artistEl ? [artistEl.text] : [] },
        chapters: { "": "全一话" },
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/g/${comicId}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const images = []
      for (const img of doc.querySelectorAll("#thumbnail-container > div > a > img")) {
        const src = img.attributes["data-src"] || img.attributes["src"]
        if (src) images.push(this.abs(src).replace("t.jpg", ".jpg"))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
