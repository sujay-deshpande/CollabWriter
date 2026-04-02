import { NextResponse } from 'next/server';
import { fetchDocumentRevisionHistory } from '@/lib/actions/document.action';

export const runtime = 'nodejs';

export async function GET(_: Request, context: { params: { id: string } }) {
  try {
    const docId = String(context.params?.id || '').trim();
    if (!docId) {
      return NextResponse.json({ ok: false, revisions: [] }, { status: 400 });
    }

    const payload = await fetchDocumentRevisionHistory(docId);
    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, revisions: [], error: error?.message || 'Failed to load revisions' },
      { status: 500 }
    );
  }
}

