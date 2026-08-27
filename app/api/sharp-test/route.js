import sharp from 'sharp'

const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

export async function GET() {
  const out = await sharp(ONE_PX_PNG).resize(50, 50).png().toBuffer()
  return new Response(`sharp resize OK, ${out.length} bytes`, {
    headers: { 'content-type': 'text/plain' },
  })
}
