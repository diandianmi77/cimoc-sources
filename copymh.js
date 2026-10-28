/** @type {import('./_venera_.js')} */
/**
 * 拷贝漫画 —— 由 Cimoc 源 CopyMH.java 转换
 * API：https://api.copymanga.com
 * 图片地址在章节页里用 AES-CBC + 十六进制密文下发，这里用 Convert.decryptAesCbc 还原。
 */
class CopyMH extends ComicSource {
  name = "拷贝漫画"
  key = "copymh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/copymh.js"

  get baseUrl() {
    return "https://copymanga.com"
  }

  get apiBase() {
    return "https://api.copymanga.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  // 十六进制字符串 -> ArrayBuffer
  hexToBuffer(hex) {
    const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "")
    const len = Math.floor(clean.length / 2)
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
    }
    return bytes.buffer
  }

  search = {
    load: async (keyword, options, page) => {
      const offset = 30 * (page - 1)
      const url = `${this.apiBase}/api/v3/search/comic?platform=1&limit=30&offset=${offset}&q=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const list = (json.results && json.results.list) || []
      const comics = list.map((it) => {
        const authors = it.author || []
        return new Comic({
          id: it.path_word,
          title: it.name,
          cover: it.cover,
          subTitle: authors.length ? authors[0].name.trim() : "",
        })
      })
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.apiBase}/api/v3/comic2/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const results = JSON.parse(res.body).results || {}
      const comic = results.comic || {}
      const author = (comic.author && comic.author[0] ? comic.author[0].name : "") || ""
      const finished = comic.status ? comic.status.value !== 0 : false

      // 章节（默认分组）
      const chapters = {}
      const chRes = await Network.get(
        `${this.apiBase}/api/v3/comic/${id}/group/default/chapters?limit=500&offset=0`,
        this.headers
      )
      if (chRes.status === 200) {
        const chJson = JSON.parse(chRes.body)
        const list = (chJson.results && chJson.results.list) || []
        for (const ch of list) chapters[ch.uuid] = ch.name
      }

      return new ComicDetails({
        title: comic.name || "",
        cover: comic.cover || "",
        description: comic.brief || "",
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: comic.datetime_updated || "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/comic/${comicId}/chapter/${epId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const dataEl = doc.querySelector("div.disposableData")
      const passEl = doc.querySelector("div.disposablePass")
      if (!dataEl || !passEl) throw "未找到加密数据"
      const data = dataEl.attributes["disposable"] || ""
      const key = (passEl.attributes["disposable"] || "").trim()
      const iv = data.slice(0, 16).trim()
      const cipherHex = data.slice(16).trim()

      const cipher = this.hexToBuffer(cipherHex)
      const decrypted = Convert.decryptAesCbc(
        cipher,
        Convert.encodeUtf8(key),
        Convert.encodeUtf8(iv)
      )
      const jsonStr = Convert.decodeUtf8(decrypted)
      const arr = JSON.parse(jsonStr)
      return { images: arr.map((it) => it.url) }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
