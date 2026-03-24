import { NextRequest, NextResponse } from 'next/server'

const API_KEY      = process.env.KAPSO_API_KEY ?? ''
const PHONE_NUM_ID = process.env.KAPSO_PHONE_NUMBER_ID ?? ''
const BASE         = 'https://api.kapso.ai/platform/v1'

// GET: fetch messages for a conversation
export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  const params = new URLSearchParams({ conversation: conversationId, per_page: '50' })

  const res = await fetch(`${BASE}/whatsapp/messages?${params}`, {
    headers: { 'X-API-Key': API_KEY },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json({ error: 'Kapso error' }, { status: res.status })

  const data = await res.json()
  return NextResponse.json({ messages: data })
}

// POST: send a reply
export async function POST(req: NextRequest) {
  if (!API_KEY || !PHONE_NUM_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { to, text } = await req.json()
  if (!to || !text) return NextResponse.json({ error: 'Missing to or text' }, { status: 400 })

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${PHONE_NUM_ID}/messages`,
    {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
