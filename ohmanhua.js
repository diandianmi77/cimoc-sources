/** @type {import('./_venera_.js')} */
/**
 * oh漫画 —— 由 Cimoc 源 Ohmanhua.java 转换
 * 原站：https://www.cocomanhua.com
 * 图片数据在页面 `C_DATA='...'`，Base64 → AES-ECB（多组密钥依次尝试）。
 */
class Ohmanhua extends ComicSource {
  name = "oh漫画"
  key = "ohmanhua"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/ohmanhua.js"

  get baseUrl() {
    return "https://www.cocomanhua.com"
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
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // Base64 -> AES-ECB 解密，密钥依次尝试
  decodeAndDecrypt(value, keys) {
    const cipher = Convert.decodeBase64(value)
    for (const key of keys) {
      try {
        const out = Convert.decryptAesEcb(cipher, Convert.encodeUtf8(key))
        const text = Convert.decodeUtf8(out)
        if (text) return text
      } catch (e) {
        // 换下一个 key
      }
    }
    return ""
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search?searchString=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const dl of doc.querySelectorAll("dl.fed-deta-info")) {
        const a = dl.querySelector("dt > a")
        const h1 = dl.querySelector("dd > h1")
        if (!a) continue
        const img = a.querySelector("img")
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: h1 ? h1.text : "",
            cover: img ? this.abs(img.attributes["data-original"] || img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(this.abs(id), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("dl.fed-deta-info > dd > h1")
      const dtA = doc.querySelector("dl.fed-deta-info > dt > a")
      const introEl = doc.querySelector("div.fed-tabs-boxs > div > p")
      const lis = doc.querySelectorAll("dl.fed-deta-info > dd > ul > li")
      const statusText = lis[0] ? lis[0].text : ""
      const authorEl = lis[1]
      let updateEl = lis[2]
      if (updateEl && !updateEl.text.includes("更新")) {
        updateEl = lis[3] ? lis[3].querySelector("a") : updateEl
      }
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("div.fed-tabs-boxs a, ul.fed-part-layout a")) {
        const href = a.attributes["href"]
        if (href && /chapter|\.html/.test(href)) chapters[href] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: dtA ? this.abs(dtA.attributes["data-original"] || "") : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(this.abs(epId), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/C_DATA=\\?'(.+?)\\?'/)
      if (!m) throw "未找到图片数据"
      const data = this.decodeAndDecrypt(m[1], ["fw122587mkertyui", "fw12558899ertyui"])
      if (!data) throw "解密失败"

      const imgTypeM = data.match(/img_type:"(.*?)"/)
      const imgType = imgTypeM ? imgTypeM[1] : ""

      if (imgType === "") {
        // 外链图片列表
        const urlsM = data.match(/urls__direct:"(.*?)"/)
        if (!urlsM) return { images: [] }
        const decoded = Convert.decodeUtf8(Convert.decodeBase64(urlsM[1]))
        return { images: decoded.split("|SEPARATER|").filter(Boolean) }
      }

      // 站内按序号拼接
      const domainM = data.match(/domain:"(.*?)"/)
      const startM = data.match(/startimg:([0-9]+?),/)
      const code2M = data.match(/enc_code2:"(.*?)"/)
      const code1M = data.match(/enc_code1:"(.*?)"/)
      if (!domainM || !startM || !code2M || !code1M) return { images: [] }

      const start = parseInt(startM[1])
      const relPath = this.decodeAndDecrypt(code2M[1], ["fw125gjdi9ertyui"])
      const totalStr = this.decodeAndDecrypt(code1M[1], ["fw122587mkertyui", "fw12558899ertyui"])
      const total = parseInt(totalStr)
      if (isNaN(total)) return { images: [] }

      const images = []
      for (let i = start; i <= total; i++) {
        const jpg = String(i).padStart(4, "0") + ".jpg"
        images.push(`https://${domainM[1]}/comic/${encodeURIComponent(relPath)}${jpg}`)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
