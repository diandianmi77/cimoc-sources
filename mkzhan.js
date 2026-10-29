/** @type {import('./_venera_.js')} */
/**
 * 漫客栈 —— https://www.mkzhan.com
 * 搜索 /search/?keyword=xx；详情 /{comicId}/ ；章节图由 comic.mkzcdn.com 的
 * chapter/content/ 接口返回（comic_id + chapter_id）。
 */
class Mkzhan extends ComicSource {
  name = "漫客栈"
  key = "mkzhan"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/mkzhan.js"

  get baseUrl() {
    return "https://www.mkzhan.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
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
      const url = `${this.baseUrl}/search/?keyword=${encodeURIComponent(keyword)}&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const item of doc.querySelectorAll("div.common-comic-item")) {
        const cid = item.attributes["data-cid"] || ""
        const a = item.querySelector("a.cover")
        const img = item.querySelector("a.cover img")
        const titleEl = item.querySelector("p.comic__title a")
        const up = item.querySelector("p.comic-update a.hl")
        if (!cid || !a) continue
        comics.push(
          new Comic({
            id: cid,
            title: titleEl ? titleEl.text : (img ? img.attributes["alt"] : ""),
            cover: img ? this.abs(img.attributes["data-src"] || img.attributes["src"]) : "",
            subTitle: up ? up.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/${id}/`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("p.comic-title")
      const coverEl = doc.querySelector("div.de-info__cover img")
      const authorEl = doc.querySelector("div.comic-author span.name a")
      const descEl = doc.querySelector("div.comic-intro p.intro")
      const tagsEl = doc.querySelectorAll("div.comic-status span.text b")
      const statusEl = doc.querySelector("div.de-chapter__title span")
      const updateEl = doc.querySelector("div.de-chapter__title span.update-time")

      const tags = {}
      if (authorEl) tags["作者"] = [authorEl.text]
      if (statusEl) tags["状态"] = [statusEl.text.trim()]
      if (tagsEl.length) tags["题材"] = tagsEl.map((t) => t.text.trim())

      const chapters = {}
      for (const a of doc.querySelectorAll("li.j-chapter-item a.j-chapter-link")) {
        const chid = a.attributes["data-chapterid"] || ""
        if (chid) chapters[chid] = a.text.trim()
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : id,
        cover: coverEl ? this.abs(coverEl.attributes["data-src"] || coverEl.attributes["src"]) : "",
        description: descEl ? descEl.text.trim() : "",
        tags: tags,
        updateTime: updateEl ? updateEl.text.replace(/^.*更新至\s*/, "").trim() : "",
        chapters: chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `https://comic.mkzcdn.com/chapter/content/?comic_id=${comicId}&chapter_id=${epId}`
      const res = await Network.get(url, {
        ...this.headers,
        "Accept": "application/json, text/plain, */*",
      })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const data = json.data || []
      const images = data
        .map((it) => (it.image || "").replace(/^http:\/\//, "https://"))
        .filter(Boolean)
      if (!images.length) throw "该章节没有图片（可能是 VIP 章节）"
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
