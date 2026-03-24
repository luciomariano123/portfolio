import { NextRequest, NextResponse } from 'next/server'

const API_KEY        = process.env.KAPSO_API_KEY ?? ''
const PHONE_NUM_ID   = process.env.KAPSO_PHONE_NUMBER_ID ?? ''
const BASE           = 'https://api.kapso.ai/platform/v1'

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { searchParams } = req.nextUrl
  const status   = searchParams.get('status') ?? 'all'
  const page     = searchParams.get('page') ?? '1'
  const per_page = searchParams.get('per_page') ?? '30'

  const params = new URLSearchParams({ status, page, per_page })
  if (PHONE_NUM_ID) params.set('phone_number_id', PHONE_NUM_ID)

  const res = await fetch(`${BASE}/whatsapp/conversations?${params}`, {
    headers: { 'X-API-Key': API_KEY },
    next: { revalidate: 0 },
  })

  if (!res.ok) return NextResponse.json({ error: 'Kapso error', status: res.status }, { status: res.status })

  const data = await res.json()
  const total      = res.headers.get('X-Total') ?? '0'
  const totalPages = res.headers.get('X-Total-Pages') ?? '1'

  return NextResponse.json({ conversations: data, total: Number(total), totalPages: Number(totalPages) })
}
