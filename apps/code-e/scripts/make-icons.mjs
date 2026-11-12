import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.resolve(import.meta.dirname, '..', 'public')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([name, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function canvas(width, height, color) {
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color[0]
    data[i * 4 + 1] = color[1]
    data[i * 4 + 2] = color[2]
    data[i * 4 + 3] = color[3]
  }
  const blend = (x, y, color, alpha = 1) => {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= width || py >= height || alpha <= 0) return
    const i = (py * width + px) * 4
    const a = Math.max(0, Math.min(1, alpha))
    data[i] = Math.round(color[0] * a + data[i] * (1 - a))
    data[i + 1] = Math.round(color[1] * a + data[i + 1] * (1 - a))
    data[i + 2] = Math.round(color[2] * a + data[i + 2] * (1 - a))
    data[i + 3] = 255
  }
  const dot = (x, y, radius, color) => {
    const r = radius
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) {
      for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
        const dist = Math.hypot(xx - x, yy - y)
        blend(xx, yy, color, Math.max(0, Math.min(1, r + 0.6 - dist)))
      }
    }
  }
  const stroke = (x0, y0, x1, y1, radius, color) => {
    const length = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(length * 2))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, color)
    }
  }
  return { data, stroke }
}

function icon(size, maskable) {
  const pink = [255, 63, 164, 255]
  const ink = [26, 10, 20]
  const { data, stroke } = canvas(size, size, pink)
  const scale = size / 32
  const radius = scale
  const draw = (x0, y0, x1, y1) => stroke(x0 * scale, y0 * scale, x1 * scale, y1 * scale, radius, ink)
  draw(12.2, 10.5, 8.2, 16)
  draw(8.2, 16, 12.2, 21.5)
  draw(19.8, 10.5, 23.8, 16)
  draw(23.8, 16, 19.8, 21.5)
  if (!maskable) {
    const corner = 8 * scale
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x < corner ? corner - x : x >= size - corner ? x - (size - corner - 1) : 0
        const dy = y < corner ? corner - y : y >= size - corner ? y - (size - corner - 1) : 0
        if (dx * dx + dy * dy > corner * corner) data[(y * size + x) * 4 + 3] = 0
      }
    }
  }
  return encodePng(size, size, data)
}

fs.writeFileSync(path.join(root, 'favicon-32.png'), icon(32, false))
fs.writeFileSync(path.join(root, 'icon-192.png'), icon(192, false))
fs.writeFileSync(path.join(root, 'icon-512.png'), icon(512, false))
fs.writeFileSync(path.join(root, 'icon-maskable-512.png'), icon(512, true))
fs.writeFileSync(path.join(root, 'apple-touch-icon.png'), icon(180, true))

const ogHtml = `<!DOCTYPE html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #0d0b1a; color: #e8e6ff; font-family: "DejaVu Sans", "Liberation Sans", sans-serif; }
  .wrap { height: 630px; display: flex; flex-direction: column; justify-content: center; padding: 80px; box-sizing: border-box; }
  .row { display: flex; align-items: center; gap: 22px; }
  .mark { width: 84px; height: 84px; border-radius: 20px; background: #ff3fa4; position: relative; }
  .mark span { position: absolute; inset: 0; display: grid; place-items: center; color: #1a0a14; font-size: 36px; font-weight: 700; }
  h1 { margin: 28px 0 8px; font-size: 84px; letter-spacing: -2px; }
  p { margin: 0; font-size: 32px; color: #a9a4d6; }
</style>
<div class="wrap">
  <div class="row"><div class="mark"><span>&lt;/&gt;</span></div></div>
  <h1>Code E</h1>
  <p>HTML, CSS, and JavaScript playground</p>
</div>`
const ogPage = '/tmp/retr0code-og.html'
fs.writeFileSync(ogPage, ogHtml)
const ogOut = path.join(root, 'og.png')
try {
  execFileSync('google-chrome', [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--user-data-dir=/tmp/retr0code-chrome-og',
    '--virtual-time-budget=2500',
    '--window-size=1200,630',
    `--screenshot=${ogOut}`,
    `file://${ogPage}`,
  ], { stdio: 'inherit', timeout: 20000 })
} catch (error) {
  if (!fs.existsSync(ogOut)) throw error
}
const og = fs.readFileSync(ogOut)
const width = og.readUInt32BE(16)
const height = og.readUInt32BE(20)
console.log('icons written', { og: `${width}x${height}`, bytes: og.length })
