import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get total protocols count
    const totalProtocols = await db.protocol.count()

    // Get last update date
    const lastProtocol = await db.protocol.findFirst({
      orderBy: { lastUpdateDate: 'desc' },
      select: { lastUpdateDate: true },
    })

    // Get protocols by category
    const allProtocols = await db.protocol.findMany({
      select: { categories: true },
    })

    const categoryCount: Record<string, number> = {}
    allProtocols.forEach((p) => {
      p.categories.forEach((cat) => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
    })

    // Get recent scraper runs
    const recentScrapes = await db.scraperRun.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        status: true,
        protocolsFound: true,
        protocolsAdded: true,
        protocolsUpdated: true,
      },
    })

    return NextResponse.json({
      totalProtocols,
      lastUpdate: lastProtocol?.lastUpdateDate,
      categoryCounts: categoryCount,
      recentScrapes,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
