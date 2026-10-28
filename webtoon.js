/** @type {import('./_venera_.js')} */
/**
 * Webtoon —— 由 Cimoc 源 Webtoon.java 转换
 * 站点：https://m.webtoons.com（繁体中文）
 */
class Webtoon extends ComicSource {
  name = "Webtoon"
  key = "webtoon"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/webtoon.js"

  get baseUrl() {
    return "https://m.webtoons.com"
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

  fmtDate(text) {
    if (!text) return ""
    const parts = text.split(/\D/).filter(Boolean)
    if (parts.length < 3) return text
    return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/zh-hant/search`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `keyword=${encodeURIComponent(keyword)}&searchType=ALL`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const a of doc.querySelectorAll("ul._searchResultList > li > a")) {
        const href = (a.attributes["href"] || "").replace(/\/$/, "")
        const parts = href.split("/")
        const cid = parts[parts.length - 1]
        const subj = a.querySelector("div.row > div.info > p.subj > span")
        const img = a.querySelector("div.row > div.pic > img")
        const author = a.querySelector("div.row > div.info > p.author")
        comics.push(
          new Comic({
            id: cid,
            title: subj ? subj.text : a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: author ? author.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/episodeList?titleNo=${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#ct > div.detail_info > a._btnInfo > p.subj")
      const coverEl = doc.querySelector("#_episodeList > li > a > div.row > div.pic > img")
      const dateEl = doc.querySelector("#_episodeList > li > a > div.row > div.info > p.date")
      const authorEl = doc.querySelector("#ct > div.detail_info > a._btnInfo > p.author")
      const introEl = doc.querySelector("#_informationLayer > p.summary_area")
      const updateEl = doc.querySelector("#_informationLayer > div.info_update")
      const finished = updateEl ? updateEl.text.includes("完結") || updateEl.text.includes("完结") : false

      const chapters = {}
      for (const a of doc.querySelectorAll("#_episodeList > li > a")) {
        const href = a.attributes["href"] || ""
        const path = href.substring(30)
        const sub = a.querySelector("div.row > div.info > p.sub_title > span")
        if (path) chapters[path] = sub ? sub.text : a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: this.fmtDate(dateEl ? dateEl.text : ""),
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/zh-hant/${epId}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var imageList = ([\s\S]*?);/)
      if (!m) throw "未找到图片数据"
      const arr = JSON.parse(m[1])
      return { images: arr.map((it) => it.url) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
