/** @type {import('./_venera_.js')} */
/**
 * 汗汗酷漫 —— 由 Cimoc 源 HHAAZZ.java 转换
 * 原站：http://hhaass.com
 * Cimoc 里 baseUrl / sw 来自用户偏好（可在“源设置”里改域名与反爬串），这里做成两个设置项。
 * 图片页需要逐页请求并用站点的字符编码表（unsuan）还原真实地址。
 */
class HHAAZZ extends ComicSource {
  name = "汗汗酷漫"
  key = "hhaazz"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/hhaazz.js"

  settings = {
    baseUrl: { title: "站点域名", type: "input", default: "http://hhaass.com" },
    sw: { title: "反爬串（sw，留空则禁用解码）", type: "input", default: "" },
  }

  get baseUrl() {
    return (this.loadSetting("baseUrl") || "http://hhaass.com").replace(/\/$/, "")
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

  // 复刻 Cimoc 的 Node.splitHref
  splitHref(str, index) {
    if (!str) return ""
    str = str.replace(/^.*\..*?\//, "")
    str = str.replace(/[/\\.=\?]/g, " ")
    const parts = str.trim().split(/\s+/)
    return parts.length > index ? parts[index] : ""
  }

  // 复刻 Cimoc 的 unsuan（站点自定义字符编码）
  unsuan(s) {
    const sw = this.loadSetting("sw") || ""
    if (!sw) return ""
    const su = this.baseUrl.replace("http://", "")
    let matched = false
    for (const piece of sw.split("|")) {
      if (piece && su.indexOf(piece) > -1) {
        matched = true
        break
      }
    }
    if (!matched) return ""

    const x = s.substring(s.length - 1)
    const w = "abcdefghijklmnopqrstuvwxyz"
    const xi = w.indexOf(x) + 1
    if (xi <= 0 || s.length < xi + 12) return ""
    const sk = s.substring(s.length - xi - 12, s.length - xi - 1)
    s = s.substring(0, s.length - xi - 12)
    const k = sk.substring(0, sk.length - 1)
    const f = sk.substring(sk.length - 1)
    for (let i = 0; i < k.length; i++) {
      s = s.split(k[i]).join(String(i))
    }
    let out = ""
    for (const code of s.split(f)) {
      const n = parseInt(code)
      if (isNaN(n)) continue
      out += String.fromCharCode(n)
    }
    return out
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.get(`${this.baseUrl}/comic/?act=search&st=${encodeURIComponent(keyword)}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("div.cComicList > li")) {
        const a = li.querySelector("a")
        const img = li.querySelector("a > img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.attributes["title"] || "",
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
      const res = await Network.get(`${this.baseUrl}/manhua/${id}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const coverEl = doc.querySelector("#about_style > img")
      const items = doc.querySelectorAll("#about_kit > ul > li")
      const getText = (i, prefix) => {
        if (!items[i]) return ""
        let t = items[i].text.trim()
        if (prefix) t = t.replace(prefix, "").trim()
        return t
      }
      const titleEl = items[0] ? items[0].querySelector("h1") : null
      const title = titleEl ? titleEl.text.trim() : ""
      const author = getText(1, "作者:")
      const statusText = getText(2, "状态:")
      const finished = statusText !== "" && !statusText.includes("连载")
      const update = getText(4, "更新:")
      let intro = getText(7, "简介")
      intro = intro.slice(1)

      const chapters = {}
      for (const ul of doc.querySelectorAll(".cVolList > ul")) {
        for (const li of ul.querySelectorAll("li")) {
          const a = li.querySelector("a")
          if (!a) continue
          const href = a.attributes["href"]
          let name = a.attributes["title"] || a.text
          name = name.replace(title, "").trim()
          if (href) chapters[href] = name
        }
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
      const firstUrl = `${this.baseUrl}${epId}`
      const first = await Network.get(firstUrl, this.headers)
      if (first.status !== 200) throw `Invalid status code: ${first.status}`

      const pathId = this.splitHref(epId, 0)
      const pathS = this.splitHref(epId, 4)
      const doc = new HtmlDocument(first.body)
      const pageCount = doc.querySelectorAll("#iPageHtm > a").length

      const images = []
      for (let i = 1; i <= pageCount; i++) {
        const pageUrl = `${this.baseUrl}/${pathId}/${i}.html?s=${pathS}&d=0`
        const res = await Network.get(pageUrl, this.headers)
        if (res.status !== 200) continue
        const d = new HtmlDocument(res.body)
        let imgKey = null
        for (const idStr of ["img1021", "img2391", "img7652", "imgCurr"]) {
          const el = d.querySelector("#" + idStr)
          if (el && el.attributes["name"]) {
            imgKey = el.attributes["name"]
            break
          }
        }
        const hd = d.querySelector("#hdDomain")
        if (!imgKey || !hd) continue
        const servers = (hd.attributes["value"] || "").split("|")
        const src = servers[0] + this.unsuan(imgKey)
        if (src) images.push(src)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
