/** @type {import('./_venera_.js')} */
/**
 * 漫画柜 —— 由 Cimoc 源 IKanman.java 转换
 * 站点：https://tw.manhuagui.com（搜索 https://www.manhuagui.com）
 * 章节页里是一段 packer 脚本，先 LZ64 解出字典再求值，拿到 cid/path/sl/files。
 */
class IKanman extends ComicSource {
  name = "漫画柜"
  key = "ikanman"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/ikanman.js"

  get baseUrl() {
    return "https://tw.manhuagui.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 4.1.1; Nexus 7 Build/JRO03D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Safari/535.19",
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

  // LZ64：6bit 值表（对应原实现的 valStrBase64）
  lzValue(ch) {
    const c = ch.charCodeAt(0)
    if (c >= 65 && c <= 90) return c - 64 // A-Z -> 1..26
    if (c >= 97 && c <= 122) return c - 71 // a-z -> 26..51
    if (c >= 48 && c <= 57) return c + 4 // 0-9 -> 52..61
    if (ch === "+") return 62
    if (ch === "/") return 63
    if (ch === "=") return 64
    return 0
  }

  // 标准 LZ-string 解压（resetValue=32, numBits=3, dictSize=4），与原 Java 移植一致
  lzDecompress(str) {
    const length = str.length
    const resetValue = 32
    let index = 1
    let val = this.lzValue(str[0])
    let position = resetValue
    let numBits = 3
    let enlargeIn = 4
    let dictSize = 4

    const readBits = (n) => {
      let bits = 0
      let power = 0
      let maxpower = Math.pow(2, n)
      while (power !== maxpower) {
        const resb = val & position
        position >>= 1
        if (position === 0) {
          position = resetValue
          val = this.lzValue(str[index++] || "")
        }
        bits |= (resb > 0 ? 1 : 0) * Math.pow(2, power)
        power++
      }
      return bits
    }

    const dictionary = []
    for (let i = 0; i < 3; i++) dictionary.push(String(i))

    let c = String(readBits(2))
    dictionary.push(c)
    let w = c
    const result = [w]

    while (true) {
      if (index > length) return ""
      const cc = readBits(numBits)
      if (cc === 0) {
        const b = readBits(8)
        dictionary.push(String.fromCharCode(b))
        c = String.fromCharCode(b)
        dictSize++
        enlargeIn--
      } else if (cc === 1) {
        const b = readBits(16)
        dictionary.push(String.fromCharCode(b))
        c = String.fromCharCode(b)
        dictSize++
        enlargeIn--
      } else if (cc === 2) {
        return result.join("")
      } else {
        const entry = dictionary[cc]
        if (!entry) return result.join("")
        c = entry
      }
      result.push(c)
      dictionary[dictSize++] = w + c[0]
      enlargeIn--
      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits)
        numBits++
      }
      w = c
    }
  }

  // 执行 packer 脚本，取出里层的 JSON
  extractPackedJson(html) {
    const packedM = html.match(/\(function\(p,a,c,k,e,d\).*?0,\{\}\)\)/)
    if (!packedM) return ""
    let packed = packedM[0]
    const parts = packed.split(",")
    const replaceable = parts[parts.length - 3]
    const fake = replaceable.split("'")[1] || ""
    const real = this.lzDecompress(fake)
    if (!real) return ""
    packed = packed.replace(replaceable, `'${real}'.split('|')`)

    let evaluated = ""
    try {
      evaluated = new Function("return " + packed)()
    } catch (e) {
      return ""
    }
    if (!evaluated) return ""
    return String(evaluated)
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `https://www.manhuagui.com/s/${encodeURIComponent(keyword)}_p${page}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("li.cf")) {
        const a = li.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const img = li.querySelector("img")
        const dl = li.querySelector("dl")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.attributes["title"] || a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            description: dl ? dl.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.book-title > h1")
      const coverEl = doc.querySelector("p.hcover > img")
      const authorEl = doc.querySelector("ul.detail-list > li:nth-child(2) > span:nth-child(2) > a")
      const introEl = doc.querySelector("#intro-cut")
      const barSpans = doc.querySelectorAll("div.chapter-bar > span.fr > span")
      const statusText = barSpans[0] ? barSpans[0].text : ""
      const updateText = barSpans[1] ? barSpans[1].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const div of doc.querySelectorAll("div.chapter-list")) {
        for (const li of div.querySelectorAll("li > a")) {
          const href = li.attributes["href"] || ""
          const parts = href.split("/")
          const path = parts.length > 2 ? parts[2] : ""
          if (path) chapters[path] = li.attributes["title"] || li.text
        }
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.attributes["title"] || authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateText,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const pageUrl = `${this.baseUrl}/comic/${comicId}/${epId}.html`
      const res = await Network.get(pageUrl, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`

      let raw = this.extractPackedJson(res.body)
      if (!raw) throw "脚本解析失败"
      // 原实现是 result.substring(12, length-12) 再 JSON.parse
      const start = raw.indexOf("{")
      const end = raw.lastIndexOf("}")
      if (start < 0 || end < 0) throw "未找到图片数据"
      const obj = JSON.parse(raw.substring(start, end + 1))

      const path = obj.path || ""
      const sl = obj.sl || {}
      const files = obj.files || []
      const e = sl.e || ""
      const m = sl.m || ""
      return {
        images: files.map((f) => `https://i.hamreus.com${path}${f}?e=${e}&m=${m}`),
      }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
