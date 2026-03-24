import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.kapso.ai/platform/v1'

export async function GET(req: NextRequest) {
  const API_KEY = process.env.KAPSO_API_KEY ?? ''

  if (!API_KEY) {
    console.error('[kapso] KAPSO_API_KEY not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const { searchParams } = req.nextUrl
  const status   = searchParams.get('status') ?? 'all'
  const page     = searchParams.get('page') ?? '1'
  const per_page = searchParams.get('per_page') ?? '30'

  // status='all' is not always supported — omit it to get everything
  const params = new URLSearchParams({ page, per_page })
  if (status && status !== 'all') params.set('status', status)

  const url = `${BASE}/whatsapp/conversations?${params}`
  console.log('[kapso] fetching:', url)

  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_KEY },
      cache: 'no-store',
    })

    const body = await res.text()
    console.log('[kapso] status:', res.status, 'body:', body.slice(0, 300))

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Kapso error', kapsoStatus: res.status, detail: body },
        { status: res.status === 401 ? 401 : 502 }
      )
    }

    const json = JSON.parse(body)
    // Kapso returns { data: [...], meta: { total_count, total_pages, ... } }
    const conversations = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : [])
    const total      = json.meta?.total_count ?? conversations.length
    const totalPages = json.meta?.total_pages ?? 1

    return NextResponse.json({ conversations, total, totalPages })
  } catch (err) {
    console.error('[kapso] fetch error:', err)
    return NextResponse.json({ error: 'Network error', detail: String(err) }, { status: 502 })
  }
}
