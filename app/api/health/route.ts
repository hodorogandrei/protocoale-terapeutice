import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * Health check endpoint for monitoring and auto-recovery
 * Checks:
 * - Server responsiveness
 * - Database connectivity
 * - System resources
 */

const prisma = new PrismaClient();

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbHealthy = await checkDatabase();

    // Check response time
    const responseTime = Date.now() - startTime;
    const healthy = dbHealthy && responseTime < 5000; // Consider unhealthy if > 5s

    if (!healthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: dbHealthy,
            responseTime: `${responseTime}ms`,
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: true,
          responseTime: `${responseTime}ms`,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}
