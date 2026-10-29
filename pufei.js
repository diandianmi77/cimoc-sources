/** @type {import('./_venera_.js')} */
/**
 * 扑飞漫画 —— 由 Cimoc 源 PuFei.java 转换
 * 原站：http://m.pufei8.com（图片：http://res.img.youzipi.net）
 * 搜索关键字按 GB2312 百分号编码；图片列表是「base64 后的一段 JS」求值得到。
 */
class PuFei extends ComicSource {
  name = "扑飞漫画"
  key = "pufei"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/pufei.js"

  get baseUrl() {
    return "http://m.pufei8.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

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
        `${this.baseUrl}/e/search/?searchget=1&tbname=mh&show=title,player,playadmin,bieming,pinyin,playadmin&tempid=4&keyboard=` +
        this.gbkUrlEncode(keyword)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("#detail > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const img = a.querySelector("div > img")
        const dds = li.querySelectorAll("dl > dd")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.querySelector("h3") ? a.querySelector("h3").text : "",
            cover: img ? this.abs(img.attributes["data-src"] || img.attributes["src"]) : "",
            subTitle: dds[0] ? dds[0].text : "",
            description: dds[4] ? dds[4].text : "",
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

      const titleEl = doc.querySelector("div.main-bar > h1")
      const coverEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > img")
      const dls = doc.querySelectorAll("div.book-detail > div.cont-list > dl")
      const updateEl = dls[2] ? dls[2].querySelector("dd") : null
      const authorEl = dls[3] ? dls[3].querySelector("dd") : null
      const introEl = doc.querySelector("#bookIntro")
      const statusEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > i")
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("div.cont-list > ul > li > a")) {
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
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/cp="(.*?)"/)
      if (!m) throw "未找到图片数据"

      const js = Convert.decodeUtf8(Convert.decodeBase64(m[1]))
      let str = ""
      try {
        str = new Function("return (" + js + ")")()
      } catch (e) {
        try {
          str = new Function(js + "\n;return typeof newImgs === 'undefined' ? '' : newImgs;")()
        } catch (e2) {
          str = ""
        }
      }
      if (!str) throw "图片解析失败"
      return {
        images: String(str)
          .split(",")
          .filter(Boolean)
          .map((p) => "http://res.img.youzipi.net/" + p.replace(/^\/+/, "")),
      }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
