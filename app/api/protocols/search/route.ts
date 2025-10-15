import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!query || query.length < 2) {
      return NextResponse.json({ protocols: [] })
    }

    // Search in code, title, and DCI fields
    const protocols = await db.protocol.findMany({
      where: {
        OR: [
          {
            code: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            dci: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
        status: {
          in: ['active', 'pending'], // Exclude discontinued and variants
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
        dci: true,
        specialtyCode: true,
      },
      take: limit,
      orderBy: [
        {
          code: 'asc',
        },
      ],
    })

    // Add type field for frontend
    const results = protocols.map(p => ({
      ...p,
      type: 'protocol' as const,
    }))

    return NextResponse.json({ protocols: results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search protocols' },
      { status: 500 }
    )
  }
}
