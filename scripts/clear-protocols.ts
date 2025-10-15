/**
 * Clear all protocols from the database
 */

import { db } from '../lib/db'

async function clearProtocols() {
  console.log('🗑️  Clearing all protocols from database...')

  try {
    const result = await db.protocol.deleteMany()
    console.log(`✅ Successfully deleted ${result.count} protocol(s)`)
  } catch (error) {
    console.error('❌ Failed to clear protocols:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  clearProtocols()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { clearProtocols }
