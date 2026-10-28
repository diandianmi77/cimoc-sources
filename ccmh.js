/** @type {import('./_venera_.js')} */
/**
 * CC漫画 —— 由 Cimoc 源 CCMH.java 转换
 * 原站：http://m.ccmh6.com
 */
class CCMH extends ComicSource {
  name = "CC漫画"
  key = "ccmh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/ccmh.js"

  get baseUrl() {
    return "http://m.ccmh6.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/12.0 Mobile/15A372 Safari/604.1",
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

  // 按正则切分文本后取第 index 段
  splitText(text, index) {
    const parts = (text || "").split(/\s+|：/)
    return parts.length > index ? parts[index] : ""
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/Search`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "Origin": this.baseUrl,
        },
        `Key=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".list > div")) {
        const a = div.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const cid = parts.length > 1 ? parts[1] : ""
        const img = div.querySelector("a > img")
        const text = a.text || ""
        comics.push(
          new Comic({
            id: cid,
            title: this.splitText(text, 0),
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: this.splitText(text, 2),
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/manhua/${id}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const introEl = doc.querySelector(".intro")
      const titleEl = doc.querySelector(".other > div > strong")
      const coverEl = doc.querySelector(".cover > img")
      const otherEl = doc.querySelector(".other")
      const otherText = otherEl ? otherEl.text : ""
      const author = this.splitText(otherText, 8)
      const update = this.splitText(otherText, 12).replace(/\[|\]/g, "")
      const statusText = this.splitText(otherText, 10)
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapterList = []
      for (const a of doc.querySelectorAll(".list > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) chapterList.push([path, a.attributes["title"] || a.text])
      }
      chapterList.reverse()
      const chapters = {}
      for (const [k, v] of chapterList) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中", update].filter(Boolean),
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const base = `${this.baseUrl}/manhua/${comicId}/${epId}.html`
      const first = await Network.get(base, this.headers)
      if (first.status !== 200) throw `Invalid status code: ${first.status}`

      // 统计分页数
      let pageCount = 0
      const re = /<a href="\?p=(\d+)">\d+<\/a>/g
      let m
      while ((m = re.exec(first.body)) !== null) {
        pageCount = Math.max(pageCount, parseInt(m[1]))
      }

      const pick = (html) => {
        const doc = new HtmlDocument(html)
        const el = doc.querySelector(".img > img")
        return el ? this.abs(el.attributes["src"]) : ""
      }

      const images = []
      if (pageCount <= 1) {
        const src = pick(first.body)
        if (src) images.push(src)
      } else {
        for (let i = 1; i <= pageCount; i++) {
          const res = await Network.get(`${base}?p=${i}`, {
            ...this.headers,
            "Referer": base,
          })
          if (res.status !== 200) continue
          const src = pick(res.body)
          if (src) images.push(src)
        }
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
