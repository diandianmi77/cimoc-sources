/** @type {import('./_venera_.js')} */
/**
 * 吹雪漫画 —— 由 Cimoc 源 ChuiXue.java 转换
 * 原站：http://www.chuixue.net（图片：chuixue1.tianshigege.com）
 */
class ChuiXue extends ComicSource {
  name = "吹雪漫画"
  key = "chuixue"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/chuixue.js"

  get baseUrl() {
    return "http://www.chuixue.net"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  // 搜索关键字按 GB2312 百分号编码
  gbkUrlEncode(str) {
    const bytes = new Uint8Array(Convert.encodeGbk(str))
    let out = ""
    for (let i = 0; i < bytes.length; i++) {
      out += "%" + bytes[i].toString(16).toUpperCase().padStart(2, "0")
    }
    return out
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url =
        `${this.baseUrl}/e/search/?searchget=1&show=title,player,playadmin,pinyin&keyboard=` +
        this.gbkUrlEncode(keyword)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("#dmList> ul > li")) {
        const a = li.querySelector("p > a")
        if (!a) continue
        const img = a.querySelector("img")
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const cid = parts.length > 1 ? parts[1] : ""
        if (!cid) continue
        comics.push(
          new Comic({
            id: cid,
            title: img ? img.attributes["alt"] || "" : "",
            cover: img ? this.abs(img.attributes["_src"] || img.attributes["src"]) : "",
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

      const titleEl = doc.querySelector("div.intro_l > div.title > h1")
      const coverEl = doc.querySelector("div.intro_l > div.info_cover > p.cover > img")
      const infoPs = doc.querySelectorAll("div.intro_l > div.info > p")
      const updateEl = doc.querySelector("div.intro_l > div.info > p > span")
      const introEl = doc.querySelector("#intro")
      const statusText = infoPs[2] ? infoPs[2].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const update = updateEl ? updateEl.text.slice(0, 10) : ""
      const author = infoPs[1] ? infoPs[1].text.slice(5).trim() : ""

      const chapters = {}
      for (const a of doc.querySelectorAll("#play_0 > ul > li > a")) {
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
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中", update].filter(Boolean),
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const referer = `${this.baseUrl}/manhua/${comicId}/${epId}.html`
      const res = await Network.get(referer, { ...this.headers, "Referer": referer })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/photosr\[1\](.*?)(\n|var)/)
      if (!m) throw "未找到图片数据"
      const images = []
      for (const part of m[1].split(";")) {
        const s = part.trim()
        const idx = s.indexOf("=")
        if (idx < 0) continue
        const path = s.substring(idx + 2, s.length - 1)
        if (path) images.push("http://chuixue1.tianshigege.com/" + path.replace(/^\/+/, ""))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
