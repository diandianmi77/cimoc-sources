/** @type {import('./_venera_.js')} */
/**
 * 汗汗漫画 —— 由 Cimoc 源 HHSSEE.java 转换
 * 原站：http://www.hhmmoo.com
 * 注意：该源在 Cimoc 里整段被注释（默认不启用），这里按注释里的实现还原。
 * 图片需逐页请求，再用站点的 unsuan 编码还原真实地址。
 */
class HHSSEE extends ComicSource {
  name = "汗汗漫画"
  key = "hhssee"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/hhssee.js"

  get baseUrl() {
    return "http://www.hhmmoo.com"
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
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // 站点的字符编码还原
  unsuan(str) {
    if (!str) return ""
    const last = str.charCodeAt(str.length - 1)
    const num = str.length - last + "a".charCodeAt(0)
    let code = str.substring(num - 13, num - 2)
    const cut = code.substring(code.length - 1)
    str = str.substring(0, num - 13)
    code = code.substring(0, code.length - 1)
    for (let i = 0; i < code.length; i++) {
      str = str.split(code[i]).join(String(i))
    }
    let out = ""
    for (const part of str.split(cut)) {
      const n = parseInt(part)
      if (!isNaN(n)) out += String.fromCharCode(n)
    }
    return out
  }

  fmtDate(text) {
    if (!text) return ""
    const parts = text.split(/\D/).filter(Boolean)
    if (parts.length < 3) return text
    return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/comic/?act=search&st=${encodeURIComponent(keyword)}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const a of doc.querySelectorAll("#list > div.cComicList > li > a")) {
        const href = a.attributes["href"] || ""
        const cid = href.substring(7, href.length - 6)
        const img = a.querySelector("img")
        comics.push(
          new Comic({
            id: cid,
            title: a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manhua${id}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const items = doc.querySelectorAll("#about_kit > ul > li")
      const titleEl = items[0] ? items[0].querySelector("h1") : null
      const title = titleEl ? titleEl.text : ""
      const coverEl = doc.querySelector("#about_style > img")
      const author = items[1] ? items[1].text.slice(3) : ""
      const statusText = items[2] ? items[2].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")
      const update = items[4] ? this.fmtDate(items[4].text.slice(3)) : ""
      const intro = items[7] ? items[7].text.slice(3) : ""

      const chapters = {}
      for (const a of doc.querySelectorAll("#permalink > div.cVolList > ul.cVolUl > li > a")) {
        let name = a.text || ""
        name = name.replace(title, "").trim()
        const href = a.attributes["href"] || ""
        const m = href.match(/\/page(\d+).*s=(\d+)/)
        if (!m) continue
        chapters[`${m[1]}-${m[2]}`] = name
      }

      return new ComicDetails({
        title,
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: intro,
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const parts = epId.split("-")
      const firstUrl = `${this.baseUrl}/page${parts[0]}/1.html?s=${parts[1]}`
      const first = await Network.get(firstUrl, this.headers)
      if (first.status !== 200) throw `Invalid status code: ${first.status}`
      const doc = new HtmlDocument(first.body)

      const hdPage = doc.querySelector("#hdPageCount")
      const hdVol = doc.querySelector("#hdVolID")
      const hdS = doc.querySelector("#hdS")
      const pageCount = hdPage ? parseInt(hdPage.attributes["value"]) : 0
      const volId = hdVol ? hdVol.attributes["value"] : ""
      const server = hdS ? hdS.attributes["value"] : ""

      const images = []
      for (let i = 1; i <= pageCount; i++) {
        const pageUrl = `${this.baseUrl}/page${volId}/${i}.html?s=${server}`
        const res = await Network.get(pageUrl, this.headers)
        if (res.status !== 200) continue
        const d = new HtmlDocument(res.body)
        const dom = d.querySelector("#hdDomain")
        const img = d.querySelector("#iBodyQ > img")
        if (!dom || !img) continue
        const host = (dom.attributes["value"] || "").split("|")[0]
        const real = this.unsuan(img.attributes["name"] || "")
        if (host && real) images.push(host + real.substring(1))
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
