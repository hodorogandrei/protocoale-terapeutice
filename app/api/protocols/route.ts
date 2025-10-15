import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const specialty = searchParams.get('specialty')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  try {
    // Build where clause
    const where: Prisma.ProtocolWhereInput = {}

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
        { dci: { contains: query, mode: 'insensitive' } },
        { rawText: { contains: query, mode: 'insensitive' } },
      ]
    }

    if (specialty) {
      where.categories = { has: specialty }
    }

    // Get total count
    const total = await db.protocol.count({ where })

    // Get protocols
    const protocols = await db.protocol.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { verified: 'desc' },
        { lastUpdateDate: 'desc' },
      ],
      select: {
        id: true,
        code: true,
        title: true,
        dci: true,
        specialtyCode: true,
        officialPdfUrl: true,
        categories: true,
        canFamilyDoctor: true,
        lastUpdateDate: true,
        publishDate: true,
        extractionQuality: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
        sublists: true,
        prescribers: true,
        status: true,
        statusReason: true,
        parentProtocolCode: true,
        lastCnasUpdate: true,
        cnasOrderNumber: true,
      },
    })

    return NextResponse.json({
      protocols,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching protocols:', error)
    return NextResponse.json(
      { error: 'Failed to fetch protocols' },
      { status: 500 }
    )
  }
}
