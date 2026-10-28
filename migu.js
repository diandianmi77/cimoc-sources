/** @type {import('./_venera_.js')} */
/**
 * 咪咕漫画 —— 由 Cimoc 源 MiGu.java 转换
 * 原站：http://www.migudm.cn
 * 搜索关键字是「UTF-8 字节 -> %XX 大写 -> Base64」这套怪编码，这里原样复刻。
 */
class MiGu extends ComicSource {
  name = "咪咕漫画"
  key = "migu"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/migu.js"

  get baseUrl() {
    return "http://www.migudm.cn"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; U; Android 4.0.4; en-gb; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
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

  encodeKeyword(keyword) {
    const bytes = new Uint8Array(Convert.encodeUtf8(keyword))
    let s = ""
    for (const b of bytes) s += "%" + b.toString(16).padStart(2, "0")
    return Convert.encodeBase64(Convert.encodeUtf8(s.toUpperCase()))
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/result/list.html?hintKey=${this.encodeKeyword(
        keyword
      )}&hintType=2&pageSize=30&pageNo=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`

      const comics = []
      const re = /href="\/comic\/(.*?).html"  title="(.*?)">\s+<img src="(.*?)".*?>/g
      let m
      while ((m = re.exec(res.body)) !== null) {
        comics.push(
          new Comic({
            id: m[1],
            title: m[2],
            cover: this.abs(m[3]),
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/${id}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.inner > .ctdbRight > .ctdbRightInner > .title")
      const coverEl = doc.querySelector("div.inner > .ctdbLeft > a > img")
      const introEl = doc.querySelector("#worksDesc")

      const chapters = {}
      const re = /<a stat='.*?' href="(?:.*?)(\d+)\.html" class="item ellipsis" title="(.*?)" data-opusname="(?:.*?)" data-index="(?:.*?)" data-url="(?:.*?)" target="_blank">/g
      let m
      const list = []
      while ((m = re.exec(res.body)) !== null) list.push([m[1], m[2]])
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text.trim() : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text.trim() : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const pageUrl = `${this.baseUrl}/${comicId}/chapter/${epId}.html`
      const page = await Network.get(pageUrl, this.headers)
      if (page.status !== 200) throw `Invalid status code: ${page.status}`
      const pm = page.body.match(/<input type="hidden" id="playUrl" value="(.*)">/)
      if (!pm) throw "未找到播放参数"

      const url = `${this.baseUrl}/opus/webQueryWatchOpusInfo.html?${pm[1]}`
      const res = await Network.get(url, { ...this.headers, "Referer": pageUrl })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const json = JSON.parse(res.body)
      const list = (json.data && json.data.jpgList) || []
      return { images: list.map((it) => it.url) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": url } }
    },

    enableTagsTranslate: false,
  }
}
