/** @type {import('./_venera_.js')} */
/**
 * 177PIC —— 由 Cimoc 源 Pic177.java 转换
 * 原站：http://www.177pic66.com
 * 注意：该源在 Cimoc 里被整段注释（含类继承），这里按注释里的实现还原。
 * 章节按“分页”切：第 i 章就是第 i 页。
 */
class Pic177 extends ComicSource {
  name = "Pic177"
  key = "pic177"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/pic177.js"

  get baseUrl() {
    return "http://www.177pic66.com"
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
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // 标题里的 [作者] / [中文][作者]
  splitTitle(raw) {
    const m = raw.match(/(\[中文\])?\[(.*?)\]/)
    const author = m ? m[2] : ""
    const title = raw.replace(/(\[中文\])?\[(.*?)\]\s*/, "")
    return { title, author }
  }

  parseBox(el) {
    const a = el.querySelector("div.tit > h2 > a")
    if (!a) return null
    const href = a.attributes["href"] || ""
    const cid = href.substring(29)
    const { title, author } = this.splitTitle(a.text || "")
    const img = el.querySelector("div.c-con > a > img")
    const dt = el.querySelector("div.c-top > div.datetime")
    return new Comic({
      id: cid,
      title,
      cover: img ? this.abs(img.attributes["src"]) : "",
      subTitle: author,
      description: dt ? dt.text.replace(" ", "-") : "",
    })
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/page/${page}?s=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const el of doc.querySelectorAll("#content > div.post_box")) {
        const c = this.parseBox(el)
        if (c) comics.push(c)
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/html/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#content > div.post > div.c-top2 > div.tit > h1")
      let rawTitle = titleEl ? titleEl.text : ""
      const { title, author } = this.splitTitle(rawTitle)
      const coverEl = doc.querySelector("#content > div.post > div.entry-content > p > img")
      const dt = doc.querySelector("#content > div.post > div.c-top2 > div.datetime")

      const count = doc.querySelectorAll("#single-navi span.single-navi").length
      const chapters = {}
      for (let i = count; i > 0; i--) chapters[String(i)] = `Ch${i}`

      return new ComicDetails({
        title,
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        tags: { "作者": author ? [author] : [] },
        updateTime: dt ? dt.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/html/${comicId}/${epId}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const images = []
      for (const img of doc.querySelectorAll("#content > div.post > div.entry-content > p > img")) {
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
