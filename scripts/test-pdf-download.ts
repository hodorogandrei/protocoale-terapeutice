import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

/**
 * Test script to diagnose PDF download issues
 */

async function testDownload() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const testUrl = 'https://www.formaremedicala.ro/media/protocoale/A10BD24.pdf';
    console.log('Testing download:', testUrl);

    const response = await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Response status:', response?.status());
    console.log('Response headers:', response?.headers());

    const buffer = await response!.buffer();
    console.log('Buffer size:', buffer.length, 'bytes');

    if (buffer.length < 2000) {
      console.log('\nBuffer content (text):');
      console.log(buffer.toString('utf-8').substring(0, 1000));
    } else {
      console.log('PDF header:', buffer.toString('utf-8', 0, 100));
    }

    // Try alternative method: evaluate and fetch
    console.log('\n=== Testing fetch method ===');
    const fetchResult = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return {
        status: response.status,
        size: arrayBuffer.byteLength,
        contentType: response.headers.get('content-type')
      };
    }, testUrl);

    console.log('Fetch result:', fetchResult);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testDownload()
  .then(() => {
    console.log('\n✓ Test complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });
