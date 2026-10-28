/** @type {import('./_venera_.js')} */
/**
 * ExHentai —— Cimoc 源 ExHentai.java 里实现被整段注释，这里按 EHentai 同构实现，
 * 域名换成 exhentai.org，并增加 Cookie 设置项（ExHentai 需要登录 Cookie 才能看图）。
 */
class ExHentai extends ComicSource {
  name = "ExHentai"
  key = "exhentai"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/exhentai.js"

  get baseUrl() {
    return "https://exhentai.org"
  }

  get cookie() {
    return this.loadSetting("cookie") || ""
  }

  get headers() {
    const h = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
    if (this.cookie) h["Cookie"] = this.cookie
    return h
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  settings = {
    cookie: {
      title: "Cookie（ipb_member_id / ipb_pass_hash / igneous）",
      type: "input",
      default: "",
    },
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/?f_search=${encodeURIComponent(keyword)}&f_apply=Apply+Filter`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const tr of doc.querySelectorAll("table.itg > tbody > tr[class^=gtr]")) {
        const a = tr.querySelector("td:nth-child(3) > div > div:nth-child(3) > a")
        const img = tr.querySelector("td:nth-child(3) > div > div:nth-child(1) > img")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const cid = href.substring(23, href.length - 2)
        let title = a.text
        const am = title.match(/\[(.*?)\]/)
        const author = am ? am[1] : ""
        title = title.replace(/\[.*?\]\s*/, "")
        const tds = tr.querySelectorAll("td")
        comics.push(
          new Comic({
            id: cid,
            title,
            cover: img ? this.abs(img.attributes["src"]) : "",
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
      const res = await Network.get(`${this.baseUrl}/g/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#gn")
      const descEl = doc.querySelector("#gj")
      const coverEl = doc.querySelector("#gd1 > img")
      const artistEl = doc.querySelector("#taglist > table > tbody > tr > td:nth-child(2) > div > a[id^=ta_artist]")
      const updateEl = doc.querySelector("#gdd > table > tbody > tr:nth-child(1) > td:nth-child(2)")

      let pages = 1
      const lenRow = doc.querySelectorAll("#gdd > table > tbody > tr")[4]
      if (lenRow) {
        const cell = lenRow.querySelector("td:nth-child(2)")
        if (cell) {
          const n = parseInt((cell.text || "").split(" ")[0])
          if (!isNaN(n)) pages = n % 40 === 0 ? n / 40 : Math.floor(n / 40) + 1
        }
      }
      const chapters = {}
      for (let i = 0; i < pages; i++) chapters[String(i)] = `Ch${i}`

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: descEl ? descEl.text : "",
        tags: { "作者": artistEl ? [artistEl.text] : [] },
        updateTime: updateEl ? updateEl.text.slice(0, 10) : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const listRes = await Network.get(`${this.baseUrl}/g/${comicId}?p=${epId}`, this.headers)
      if (listRes.status !== 200) throw `Invalid status code: ${listRes.status}`
      const doc = new HtmlDocument(listRes.body)
      const pageUrls = doc.querySelectorAll("#gdt > div > div > a").map((a) => a.attributes["href"])

      const images = []
      for (const pageUrl of pageUrls) {
        if (!pageUrl) continue
        const r = await Network.get(pageUrl, this.headers)
        if (r.status !== 200) continue
        const d = new HtmlDocument(r.body)
        const img = d.querySelector("#img") || d.querySelector("a > img[style]")
        if (img && img.attributes["src"]) images.push(img.attributes["src"])
      }
      return { images }
    },

    onImageLoad: (url) => {
      const h = { "Referer": this.baseUrl + "/" }
      if (this.cookie) h["Cookie"] = this.cookie
      return { headers: h }
    },

    enableTagsTranslate: false,
  }
}
