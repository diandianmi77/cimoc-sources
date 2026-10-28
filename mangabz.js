/** @type {import('./_venera_.js')} */
/**
 * MangaBZ —— 由 Cimoc 源 MangaBZ.kt 转换
 * 原站：http://www.mangabz.com
 * 图片走 chapterimage.ashx 逐页取，返回的是一段 eval 混淆脚本。
 */
class MangaBZ extends ComicSource {
  name = "MangaBZ"
  key = "mangabz"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/mangabz.js"

  get baseUrl() {
    return "http://www.mangabz.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
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

  // 从 eval 混淆脚本里取结果（等价于 Cimoc 的 evalDecrypt）
  evalResult(code) {
    const tries = [
      code + "\n;return typeof newImgs !== 'undefined' ? newImgs : '';",
      "return (" + code + ")",
    ]
    for (const body of tries) {
      try {
        const v = new Function(body)()
        if (v) return String(v)
      } catch (e) {
        // 换下一种
      }
    }
    return ""
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search?title=${encodeURIComponent(keyword)}&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".mh-item")) {
        const a = div.querySelector("a")
        if (!a) continue
        const cid = (a.attributes["href"] || "").replace(/^\/+|\/+$/g, "")
        const cover = div.querySelector(".mh-cover")
        const title = div.querySelector(".title")
        const ch = div.querySelector(".chapter > a")
        comics.push(
          new Comic({
            id: cid,
            title: title ? title.text : "",
            cover: cover ? this.abs(cover.attributes["src"]) : "",
            description: ch ? ch.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector(".detail-info-title")
      const coverEl = doc.querySelector(".detail-info-cover")
      const authorEl = doc.querySelector(".detail-info-tip > span > a")
      const introEl = doc.querySelector(".detail-info-content")
      const formEl = doc.querySelector(".detail-list-form-title")
      const formText = formEl ? formEl.text : ""
      const dm = formText.match(/(..月..號 | ....-..-..)/)
      const update = dm ? dm[0] : ""
      const finished = formText.includes("完结") || formText.includes("完結")

      const chapters = {}
      for (const a of doc.querySelectorAll("#chapterlistload > a")) {
        const href = a.attributes["href"] || ""
        const path = href.replace(/^\/+|\/+$/g, "")
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
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const pageUrl = `${this.baseUrl}/${epId}/`
      const res = await Network.get(pageUrl, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const reVal = (name, pat) => {
        const m = html.match(new RegExp("var\\s+" + name + "\\s*=\\s*" + pat + "\\s*;"))
        return m ? m[1] : ""
      }
      const mid = reVal("MANGABZ_MID", "(\\w+)")
      const cid = reVal("MANGABZ_CID", "(\\w+)")
      const sign = reVal("MANGABZ_VIEWSIGN", "\"(\\w+)\"")
      const count = reVal("MANGABZ_IMAGE_COUNT", "(\\d+)")
      const pageCount = parseInt(count)
      if (!mid || !cid || !pageCount) throw "未找到图片参数"

      const images = []
      for (let i = 1; i <= pageCount; i++) {
        const dt = new Date().toISOString().replace("T", "+").slice(0, 19)
        const url = `${this.baseUrl}/${epId}/chapterimage.ashx?cid=${cid}&page=${i}&key=&_cid=${cid}&_mid=${mid}&_sign=${sign}&_dt=${dt}`
        const r = await Network.get(url, { ...this.headers, "Referer": pageUrl })
        if (r.status !== 200) continue
        const val = this.evalResult(r.body)
        const first = val.split(",")[0]
        if (first) images.push(first)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
