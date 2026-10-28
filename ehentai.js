/** @type {import('./_venera_.js')} */
/**
 * EHentai —— 由 Cimoc 源 EHentai.java 转换
 * 站点：https://e-hentai.org（图片页走 g.e-hentai.org，需要 nw=1 Cookie）
 * 章节按图集每页 40 张切分；每张图还要再请求一次图片页拿真实地址。
 */
class EHentai extends ComicSource {
  name = "EHentai"
  key = "ehentai"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/ehentai.js"

  get baseUrl() {
    return "https://e-hentai.org"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Cookie": "nw=1",
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

  search = {
    load: async (keyword, options, page) => {
      const filters =
        "f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1&f_cosplay=1&f_asianporn=1&f_misc=1"
      const url = `${this.baseUrl}/?${filters}&f_search=${encodeURIComponent(keyword)}&f_apply=Apply+Filter`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const tr of doc.querySelectorAll("div.ido > div > table.itg > tbody > tr[class^=gtr]")) {
        const a = tr.querySelector("td:nth-child(3) > div > div:nth-child(3) > a")
        const img = tr.querySelector("td:nth-child(3) > div > div:nth-child(1) > img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const cid = href.substring(23, href.length - 2)
        let title = a.text
        const authorM = title.match(/\[(.*?)\]/)
        const author = authorM ? authorM[1] : ""
        title = title.replace(/\[.*?\]\s*/, "")
        const cover = img ? this.abs(img.attributes["src"]) : ""
        const tds = tr.querySelectorAll("td")
        comics.push(
          new Comic({
            id: cid,
            title,
            cover,
            subTitle: author,
            description: tds[1] ? tds[1].text.slice(0, 10) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = `http://g.e-hentai.org/g/${id}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#gn")
      const descEl = doc.querySelector("#gj")
      const artistEl = doc.querySelector("#taglist > table > tbody > tr > td:nth-child(2) > div > a[id^=ta_artist]")
      const updateEl = doc.querySelector("#gdd > table > tbody > tr:nth-child(1) > td:nth-child(2)")

      // 页数 = ceil(图片总数 / 40)
      let pages = 1
      const lenRow = doc.querySelectorAll("#gdd > table > tbody > tr")[4]
      if (lenRow) {
        const lenText = lenRow.querySelector("td:nth-child(2)")
        if (lenText) {
          const n = parseInt((lenText.text || "").split(" ")[0])
          if (!isNaN(n)) pages = n % 40 === 0 ? n / 40 : Math.floor(n / 40) + 1
        }
      }
      const chapters = {}
      for (let i = 0; i < pages; i++) chapters[String(i)] = `Ch${i}`

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: "https://github.com/Haleydu/Cimoc/raw/release-tci/screenshot/icon.png",
        description: descEl ? descEl.text : "",
        tags: { "作者": artistEl ? [artistEl.text] : [] },
        updateTime: updateEl ? updateEl.text.slice(0, 10) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const listRes = await Network.get(`http://g.e-hentai.org/g/${comicId}/?p=${epId}`, this.headers)
      if (listRes.status !== 200) throw `Invalid status code: ${listRes.status}`
      const doc = new HtmlDocument(listRes.body)

      const pageUrls = doc.querySelectorAll("#gdt > div > div > a").map((a) => a.attributes["href"])
      const images = []
      for (const pageUrl of pageUrls) {
        if (!pageUrl) continue
        const r = await Network.get(pageUrl, this.headers)
        if (r.status !== 200) continue
        const d = new HtmlDocument(r.body)
        const img = d.querySelector("a > img[style]") || d.querySelector("#img")
        const src = img ? img.attributes["src"] : null
        if (src) images.push(src)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
