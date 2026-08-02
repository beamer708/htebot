// utils/banners.js — verifies the panel banner PNGs in assets/banners/ at
// startup and hands out disk attachments for MediaGallery use. Banners are
// pre-installed on the host; nothing is ever downloaded.
//
// Matching is tolerant: a requested "GetStarted.png" matches an on-disk
// "Get Started.png", "get_started.png", etc. (case + spaces/underscores/
// hyphens ignored). The Discord attachment is always given the clean,
// space-free requested name, because spaces in attachment:// references are
// unreliable.
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const BANNERS_DIR = path.join(__dirname, '..', 'assets', 'banners');
const EXPECTED = ['Dashboard.png', 'ServerRules.png', 'Campaigns.png', 'GetStarted.png'];
const FOOTER_FILE = 'footer.png';

// normalized name (lowercase, no spaces/_/-) → actual on-disk filename
let diskFiles = new Map();

const norm = (s) => String(s).toLowerCase().replace(/[\s_-]+/g, '');

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
    if (file.startsWith('.')) continue; // skip .gitkeep and hidden files
    diskFiles.set(norm(file), file);
  }

  for (const expected of EXPECTED) {
    const actual = diskFiles.get(norm(expected));
    if (!actual) {
      console.warn(`[Banners] Missing banner file: assets/banners/${expected}. Panels using it will post without a banner.`);
    } else if (actual !== expected) {
      console.log(`[Banners] Matched "${actual}" for ${expected} (attached as ${expected}).`);
    }
  }
  console.log(`[Banners] ${diskFiles.size} banner file(s) found in assets/banners.`);
}

/**
 * Get a banner as { attachment, url } for MediaGallery + files, or null if the
 * file is not on disk. The attachment is named with the clean requested
 * filename so the attachment:// reference never contains spaces.
 */
function getBanner(filename) {
  const actual = diskFiles.get(norm(filename));
  if (!actual) return null;
  const filePath = path.join(BANNERS_DIR, actual);
  if (!fs.existsSync(filePath)) return null;
  const safeName = String(filename).replace(/[\s_-]+/g, ''); // e.g. "GetStarted.png"
  return {
    attachment: new AttachmentBuilder(filePath, { name: safeName }),
    url: `attachment://${safeName}`,
  };
}

/** Footer strip is optional by design: present → thin branded closing strip. */
function getFooterBanner() {
  return getBanner(FOOTER_FILE);
}

module.exports = { verifyBanners, getBanner, getFooterBanner, BANNERS_DIR };
