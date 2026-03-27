// OCR is now handled client-side with tesseract.js in the browser.
// This endpoint is kept for future use but no longer needed for the import flow.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Use client-side OCR instead' }, { status: 410 })
}
