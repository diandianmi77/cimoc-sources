/** @type {import('./_venera_.js')} */
/**
 * 我要去漫画 —— 由 Cimoc 源 MH517.java 转换
 * 原站：http://m.517manhua.com
 */
class MH517 extends ComicSource {
  name = "我要去漫画"
  key = "mh517"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/mh517.js"

  get baseUrl() {
    return "http://m.517manhua.com"
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

  parseList(doc) {
    const comics = []
    for (const li of doc.querySelectorAll("ul#listbody > li")) {
      const a = li.querySelector("a.ImgA")
      const img = li.querySelector("a.ImgA > img")
      if (!a) continue
      comics.push(
        new Comic({
          id: a.attributes["href"],
          title: li.querySelector("a.txtA") ? li.querySelector("a.txtA").text : "",
          cover: img ? this.abs(img.attributes["src"]) : "",
        })
      )
    }
    return comics
  }

  /// 搜索（原站只支持第 1 页）
  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/statics/search.aspx?key=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      return { comics: this.parseList(doc), maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      let url = id
      if (url.indexOf(this.baseUrl) === -1) url = this.baseUrl + url
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const img = doc.querySelector("div#Cover > img")
      const updateEl = doc.querySelector("span.date")
      const introEl = doc.querySelector("p.txtDesc")

      const chapters = {}
      for (const li of doc.querySelectorAll("#mh-chapter-list-ol-0 > li")) {
        const a = li.querySelector("a")
        const span = li.querySelector("a > span")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : parts[parts.length - 1]
        chapters[path] = span ? span.text : a.text
      }

      return new ComicDetails({
        title: img ? img.attributes["title"] || "" : "",
        cover: img ? this.abs(img.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      let cid = comicId
      if (cid.indexOf("http") !== -1) cid = cid.replace(/^https?:\/\/[^/]+/, "")
      const url = `${this.baseUrl}${cid}/${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const m = html.match(/qTcms_S_m_murl_e="(.*?)"/)
      if (!m) throw "未找到图片数据"
      const idMatch = html.match(/var qTcms_S_m_id="(\w+?)";/)
      const mangaid = idMatch ? idMatch[1] : ""

      const decoded = Convert.decodeUtf8(Convert.decodeBase64(m[1]))
      const images = []
      for (const item of decoded.split(/\$.*?\$/)) {
        const p = item.trim()
        if (!p) continue
        images.push(
          `${this.baseUrl}/statics/pic/?p=${p}&wapif=1&picid=${mangaid}&m_httpurl=`
        )
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
