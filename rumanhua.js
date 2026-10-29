/** @type {import('./_venera_.js')} */
/**
 * 如漫画 —— http://rumanhua2.com（只有 http）
 * 搜索：POST /s  (k=关键字)
 * 详情：GET /{comicId}/ ，章节再 POST /morechapter (id=comicId) 补齐
 * 章节：GET /{comicId}/{chapterId}.html
 *   图片清单写在页面里的 eval(p,a,c,k,e) 打包脚本中（var __c0rst96="..."），
 *   解码方式：base64 → 与 "cdcsdwq" 循环异或 → 再 base64 → JSON 数组。
 */
class Rumanhua extends ComicSource {
  name = "如漫画"
  key = "rumanhua"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/rumanhua.js"

  get baseUrl() {
    return "http://rumanhua2.com"
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
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // Dean Edwards packer 解包（兼容 ru 站 p,a,c,k,e,d 变体）
  unpack(html) {
    const m = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/)
    if (!m) return ""
    const p = m[1]
    const a = parseInt(m[2])
    const c = parseInt(m[3])
    const k = m[4].split("|")
    const digit = (d) => (d > 35 ? String.fromCharCode(d + 29) : d.toString(36))
    const e = (n) => {
      let s = ""
      while (n >= a) {
        s = digit(n % a) + s
        n = Math.floor(n / a)
      }
      return digit(n % a) + s
    }
    let out = p
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        out = out.replace(new RegExp("\\b" + e(i) + "\\b", "g"), k[i])
      }
    }
    return out
  }

  // 页面里 id="N" 决定用第 N 个密钥；解不开就依次试其它密钥
  get keys() {
    return [
      "smkhy258", "smkd95fv", "md496952", "cdcsdwq", "vbfsa256",
      "cawf151c", "cd56vvda", "8kihtn9", "dso15tlo", "5ko6plhy",
    ]
  }

  decryptBlob(blob, key) {
    const raw = new Uint8Array(Convert.decodeBase64(blob))
    for (let i = 0; i < raw.length; i++) {
      raw[i] ^= key.charCodeAt(i % key.length)
    }
    const inner = Convert.decodeUtf8(raw.buffer)
    const text = Convert.decodeUtf8(Convert.decodeBase64(inner))
    return JSON.parse(text)
  }

  // __c0rst96 -> base64 -> xor(key) -> base64 -> JSON
  decodeImages(html) {
    const decoded = this.unpack(html) || html
    const m = decoded.match(/__c0rst96\s*=\s*"([^"]+)"/)
    if (!m) return []

    const idm = html.match(/\bid="(\d)"[^>]*>\s*<\/?(?:div|span|p|input)/) || html.match(/\bid="(\d)"/)
    const idx = idm ? parseInt(idm[1]) : -1
    const order = []
    if (idx >= 0 && idx < this.keys.length) order.push(this.keys[idx])
    for (const k of this.keys) if (!order.includes(k)) order.push(k)

    for (const key of order) {
      try {
        const arr = this.decryptBlob(m[1], key)
        if (Array.isArray(arr) && arr.length && typeof arr[0] === "string") return arr
      } catch (e) {}
    }
    return []
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/s`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "Referer": this.baseUrl + "/",
        },
        `k=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const list = json.data || []
      const comics = list.map(
        (it) =>
          new Comic({
            id: it.id,
            title: it.name,
            cover: it.imgurl,
            subTitle: it.remarks || "",
          })
      )
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("h1.name")
      const coverEl = doc.querySelector("div.book-cover img")
      const descEl = doc.querySelector("div.cartoon-introduction p")
      const tagEls = doc.querySelectorAll("p.comic-tags span")

      let author = ""
      for (const p of doc.querySelectorAll("div.comic-info-detail p")) {
        if (p.text.includes("作者")) author = p.text.replace(/^.*作者[:：]/, "").trim()
      }

      const chapters = {}
      const addChapter = (href, name) => {
        const m = href.match(/\/([^/]+)\.html$/)
        if (m) chapters[m[1]] = name
      }
      for (const a of doc.querySelectorAll("div.chaplist-box ul li a")) {
        addChapter(a.attributes["href"] || "", a.text.trim())
      }

      // 剩余章节
      try {
        const more = await Network.post(
          `${this.baseUrl}/morechapter`,
          {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "Referer": `${this.baseUrl}/${id}/`,
          },
          `id=${id}`
        )
        if (more.status === 200) {
          const json = JSON.parse(more.body)
          for (const it of json.data || []) {
            if (it.chapterid) chapters[it.chapterid] = it.chaptername
          }
        }
      } catch (e) {}

      const tags = {}
      if (author) tags["作者"] = [author]
      if (tagEls.length) tags["标签"] = tagEls.map((t) => t.text)

      return new ComicDetails({
        title: titleEl ? titleEl.text : id,
        cover: coverEl ? this.abs(coverEl.attributes["data-src"] || coverEl.attributes["src"]) : "",
        description: descEl ? descEl.text.trim() : "",
        tags: tags,
        chapters: chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const images = this.decodeImages(res.body)
      if (!images.length) throw "未能解析章节图片"
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
