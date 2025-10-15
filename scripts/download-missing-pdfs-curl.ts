import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Downloads missing protocol PDFs from FormareMedicala.ro using curl
 * More reliable than Puppeteer for direct PDF downloads
 */

interface MissingProtocol {
  code: string;
  title: string;
  pdfUrl: string;
}

async function downloadWithCurl(url: string, outputPath: string): Promise<boolean> {
  try {
    // Use curl with follow redirects and timeout
    await execAsync(`curl -L -f --max-time 30 "${url}" -o "${outputPath}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    // Verify file was downloaded and is not too small
    const stats = statSync(outputPath);
    if (stats.size < 1000) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function downloadMissingPDFs() {
  // Load missing protocols
  const missingProtocols = JSON.parse(
    readFileSync('data/missing-protocols.json', 'utf-8')
  ) as MissingProtocol[];

  console.log(`Found ${missingProtocols.length} missing protocols to download\n`);

  // Ensure individual PDFs directory exists
  const pdfDir = 'data/pdfs/individual';
  if (!existsSync(pdfDir)) {
    mkdirSync(pdfDir, { recursive: true });
    console.log(`Created directory: ${pdfDir}\n`);
  }

  const stats = {
    downloaded: 0,
    skipped: 0,
    failed: 0,
    failedCodes: [] as string[]
  };

  for (let i = 0; i < missingProtocols.length; i++) {
    const protocol = missingProtocols[i];
    const fileName = `${protocol.code}.pdf`;
    const filePath = join(pdfDir, fileName);

    // Check if already downloaded
    if (existsSync(filePath)) {
      const existingSize = statSync(filePath).size;
      if (existingSize > 1000) {
        console.log(`[${i + 1}/${missingProtocols.length}] ⏭️  Skipped ${protocol.code} (already exists, ${(existingSize / 1024).toFixed(1)}KB)`);
        stats.skipped++;
        continue;
      }
    }

    try {
      console.log(`[${i + 1}/${missingProtocols.length}] ⬇️  Downloading ${protocol.code}: ${protocol.title.substring(0, 60)}...`);

      const success = await downloadWithCurl(protocol.pdfUrl, filePath);

      if (!success) {
        console.log(`   ❌ Failed: Download error or file too small`);
        stats.failed++;
        stats.failedCodes.push(protocol.code);
        continue;
      }

      const fileSize = statSync(filePath).size;
      const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
      console.log(`   ✅ Downloaded: ${sizeMB} MB`);
      stats.downloaded++;

      // Rate limiting - wait 200ms between downloads
      if (i < missingProtocols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error: any) {
      console.log(`   ❌ Error downloading ${protocol.code}: ${error.message}`);
      stats.failed++;
      stats.failedCodes.push(protocol.code);
    }
  }

  // Print summary
  console.log(`\n=== Download Summary ===`);
  console.log(`Total protocols: ${missingProtocols.length}`);
  console.log(`✅ Downloaded: ${stats.downloaded}`);
  console.log(`⏭️  Skipped (already exists): ${stats.skipped}`);
  console.log(`❌ Failed: ${stats.failed}`);

  if (stats.failedCodes.length > 0) {
    console.log(`\nFailed codes (${stats.failedCodes.length}):`);
    console.log(stats.failedCodes.join(', '));
  }

  // Save download stats
  writeFileSync(
    'data/download-stats.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...stats
    }, null, 2)
  );
  console.log(`\n✓ Saved download statistics to data/download-stats.json`);

  return stats;
}

downloadMissingPDFs()
  .then(stats => {
    console.log(`\n✓ Download complete`);
    console.log(`Successfully downloaded: ${stats.downloaded} protocols`);
    console.log(`Next step: Extract and import protocols into database`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Download failed:', error);
    process.exit(1);
  });
