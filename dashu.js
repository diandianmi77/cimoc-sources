/** @type {import('./_venera_.js')} */
/**
 * 大树漫画 —— https://www.dashumanhua.com
 * 搜索 /search?searhword=xx&types=comic ；详情 /comic/{slug}/ ；
 * 章节图片写在页面里的 eval(p,a,c,k,e) 打包脚本中（var picTree=[...]），本地解包。
 */
class Dashu extends ComicSource {
  name = "大树漫画"
  key = "dashu"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/dashu.js"

  get baseUrl() {
    return "https://www.dashumanhua.com"
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

  // 解 Dean Edwards packer: eval(function(p,a,c,k,e,d){...}('p',a,c,'k'.split('|'),0,{}))
  unpack(html) {
    const m = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/)
    if (!m) return ""
    const p = m[1]
    const a = parseInt(m[2])
    const c = parseInt(m[3])
    const k = m[4].split("|")

    const e = (n) => {
      let s = ""
      while (n >= a) {
        let d = n % a
        s = (d > 35 ? String.fromCharCode(d + 29) : d.toString(36)) + s
        n = Math.floor(n / a)
      }
      let d = n % a
      s = (d > 35 ? String.fromCharCode(d + 29) : d.toString(36)) + s
      return s
    }

    let out = p
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        const token = e(i)
        out = out.replace(new RegExp("\\b" + token + "\\b", "g"), k[i])
      }
    }
    return out
  }

  /// 从章节页里取出 picTree 图片数组
  parseImages(html) {
    const decoded = this.unpack(html)
    const src = decoded || html
    const m = src.match(/picTree\s*=\s*(\[[\s\S]*?\])\s*;/)
    if (!m) return []
    try {
      return JSON.parse(m[1])
    } catch (e) {
      const urls = m[1].match(/"(https?:[^"]+)"/g) || []
      return urls.map((u) => u.slice(1, -1).replace(/\\\//g, "/").replace(/\\u0026/g, "&"))
    }
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search?searhword=${encodeURIComponent(keyword)}&types=comic&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const dt of doc.querySelectorAll("dl.alllist > dt")) {
        const a = dt.querySelector("div.img > a")
        const img = dt.querySelector("div.img > a > img")
        const ti = dt.querySelector("div.text > div.ti > a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const id = href.replace(/\/+$/, "").split("/").pop()
        if (!id) continue
        comics.push(
          new Comic({
            id: id,
            title: ti ? ti.text : a.attributes["title"] || "",
            cover: img ? this.abs(img.attributes["data-original"] || img.attributes["src"]) : "",
          })
        )
      }
      // 分页信息：页面底部 a[href*="&page="]
      let maxPage = page
      for (const link of doc.querySelectorAll("div.mypage a, div.pagination a")) {
        const href = link.attributes["href"] || ""
        const m = href.match(/page=(\d+)/)
        if (m) maxPage = Math.max(maxPage, parseInt(m[1]))
      }
      return { comics, maxPage: maxPage > page ? maxPage : null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `${this.baseUrl}/comic/${id}/`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("h1.bookname")
      const coverEl = doc.querySelector("#setnmh-bookms div.img img")
      const descEl = doc.querySelector("#setnmh-bookms div.ms")

      let author = ""
      let status = ""
      for (const dd of doc.querySelectorAll("#setnmh-bookms dd")) {
        const t = dd.text
        if (t.includes("作者")) author = t.replace(/^.*作者[:：]/, "").trim()
        if (t.includes("状态")) status = t.replace(/^.*状态[:：]/, "").trim()
      }
      const tags = {}
      if (author) tags["作者"] = [author]
      if (status) tags["状态"] = [status]
      const tagEls = doc.querySelectorAll("#setnmh-bookms div.tags > a")
      if (tagEls.length) tags["标签"] = tagEls.map((t) => t.text)

      let description = descEl ? descEl.text : ""
      description = description.replace(/^介绍[:：]/, "").trim()

      const chapters = {}
      for (const a of doc.querySelectorAll("#ul_chapter1 > li > a")) {
        const href = a.attributes["href"] || ""
        const m = href.match(/read-(\d+)\.html/)
        if (m) chapters[m[1]] = a.text.replace(/（\d+P）$/, "").trim()
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : id,
        cover: coverEl ? this.abs(coverEl.attributes["data-original"] || coverEl.attributes["src"]) : "",
        description: description,
        tags: tags,
        chapters: chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/comic/${comicId}/read-${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const images = this.parseImages(res.body)
      if (!images.length) throw "未能解析章节图片"
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
