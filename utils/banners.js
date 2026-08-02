// utils/banners.js — verifies the panel banner PNGs in assets/banners/ at
// startup and hands out disk attachments for MediaGallery use. Banners are
// pre-installed on the host; nothing is ever downloaded.
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const BANNERS_DIR = path.join(__dirname, '..', 'assets', 'banners');
const EXPECTED = ['Dashboard.png', 'ServerRules.png', 'Campaigns.png', 'GetStarted.png'];
const FOOTER_FILE = 'footer.png';

// expected/requested name (lowercased) → actual on-disk filename, exact case
let diskFiles = new Map();

/** Scan assets/banners once at startup; log what's there and what's missing. */
function verifyBanners() {
  diskFiles = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(BANNERS_DIR);
  } catch {
    console.warn(`[Banners] Directory not found: ${BANNERS_DIR}. Panels will post without banners.`);
    return;
  }

  for (const file of entries) {
    diskFiles.set(file.toLowerCase(), file);
  }

  for (const expected of EXPECTED) {
    const actual = diskFiles.get(expected.toLowerCase());
    if (!actual) {
      console.warn(`[Banners] Missing banner file: assets/banners/${expected}. Panels using it will post without a banner.`);
    } else if (actual !== expected) {
      console.warn(`[Banners] Case mismatch: expected ${expected}, found ${actual}. Using the on-disk name.`);
    }
  }
  console.log(`[Banners] ${entries.length} file(s) found in assets/banners.`);
}

/**
 * Get a banner as { attachment, url } for MediaGallery + files, or null if
 * the file is not on disk (logged once at verify time; quiet here).
 */
function getBanner(filename) {
  const actual = diskFiles.get(String(filename).toLowerCase());
  if (!actual) return null;
  const filePath = path.join(BANNERS_DIR, actual);
  if (!fs.existsSync(filePath)) return null;
  return {
    attachment: new AttachmentBuilder(filePath, { name: actual }),
    url: `attachment://${actual}`,
  };
}

/** Footer strip is optional by design: present → thin branded closing strip. */
function getFooterBanner() {
  return getBanner(FOOTER_FILE);
}

module.exports = { verifyBanners, getBanner, getFooterBanner, BANNERS_DIR };
