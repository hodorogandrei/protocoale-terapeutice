import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  try {
    const protocol = await db.protocol.findUnique({
      where: { code },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        sections: {
          orderBy: { order: 'asc' },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    })

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(protocol)
  } catch (error) {
    console.error('Error fetching protocol:', error)
    return NextResponse.json(
      { error: 'Failed to fetch protocol' },
      { status: 500 }
    )
  }
}
