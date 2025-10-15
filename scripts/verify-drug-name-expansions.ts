import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify that drug name expansions were successfully applied to the database
 */
async function verifyExpansions() {
  console.log('🔍 Verifying drug name expansions...\n');

  // Check the protocols we updated
  const updatedCodes = ['A015E', 'A019E', 'A10AE06', 'A10AE54'];

  for (const code of updatedCodes) {
    const protocol = await prisma.protocol.findUnique({
      where: { code },
      select: {
        code: true,
        title: true,
        dci: true,
      }
    });

    if (protocol) {
      console.log(`Code: ${protocol.code}`);
      console.log(`  Title: ${protocol.title}`);
      if (protocol.dci) {
        console.log(`  DCI: ${protocol.dci}`);
      }
      console.log();
    } else {
      console.log(`❌ Protocol ${code} not found\n`);
    }
  }

  // Check for any remaining short names
  console.log('\n📊 Checking for remaining short drug names...\n');

  const allProtocols = await prisma.protocol.findMany({
    select: {
      code: true,
      title: true,
      dci: true,
    }
  });

  const shortNames = ['LISPRO', 'GLULIZINA', 'ASPART', 'DETEMIR', 'GLARGINE', 'DEGLUDEC'];
  const remaining: any[] = [];

  for (const protocol of allProtocols) {
    for (const shortName of shortNames) {
      // Check if short name exists but NOT preceded by INSULINUM
      const titleHasShortName =
        protocol.title.includes(shortName) &&
        !protocol.title.match(new RegExp(`INSULINUM\\s+${shortName}`, 'i'));

      const dciHasShortName =
        protocol.dci &&
        protocol.dci.includes(shortName) &&
        !protocol.dci.match(new RegExp(`INSULINUM\\s+${shortName}`, 'i'));

      if (titleHasShortName || dciHasShortName) {
        remaining.push({
          code: protocol.code,
          title: protocol.title,
          dci: protocol.dci,
          shortName,
        });
      }
    }
  }

  if (remaining.length === 0) {
    console.log('✅ No remaining short drug names found - all expansions successful!');
  } else {
    console.log(`⚠️  Found ${remaining.length} protocols with remaining short names:\n`);

    for (const item of remaining.slice(0, 10)) {
      console.log(`Code: ${item.code}`);
      console.log(`  Short name: ${item.shortName}`);
      console.log(`  Title: ${item.title.substring(0, 100)}`);
      if (item.dci) {
        console.log(`  DCI: ${item.dci}`);
      }
      console.log();
    }

    if (remaining.length > 10) {
      console.log(`... and ${remaining.length - 10} more\n`);
    }
  }

  console.log('\n📈 Summary:');
  console.log(`  Updated protocols verified: ${updatedCodes.length}`);
  console.log(`  Remaining short names: ${remaining.length}`);
  console.log(`  Success rate: ${((allProtocols.length - remaining.length) / allProtocols.length * 100).toFixed(1)}%`);
}

verifyExpansions()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
