/**
 * Script pour générer les icônes PNG à partir du SVG
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, "..", "public");

// Lire le SVG
const svgContent = readFileSync(join(publicDir, "favicon.svg"), "utf-8");

// Modifier le SVG pour avoir un fond noir et centrer l'icône
const svgWithBackground = `
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" fill="#0a0a0a" rx="40"/>
  <g transform="translate(75, 75)">
    ${svgContent
      .replace(/<\?xml.*?\?>/, "")
      .replace(/<svg[^>]*>/, "")
      .replace("</svg>", "")}
  </g>
</svg>
`;

async function generateIcons() {
  try {
    // Apple Touch Icon (180x180)
    await sharp(Buffer.from(svgWithBackground))
      .resize(180, 180)
      .png()
      .toFile(join(publicDir, "apple-touch-icon.png"));
    console.log("✓ apple-touch-icon.png généré");

    // Favicon 32x32
    await sharp(Buffer.from(svgWithBackground))
      .resize(32, 32)
      .png()
      .toFile(join(publicDir, "favicon-32x32.png"));
    console.log("✓ favicon-32x32.png généré");

    // Favicon 16x16
    await sharp(Buffer.from(svgWithBackground))
      .resize(16, 16)
      .png()
      .toFile(join(publicDir, "favicon-16x16.png"));
    console.log("✓ favicon-16x16.png généré");

    // Android Chrome icons pour PWA
    await sharp(Buffer.from(svgWithBackground))
      .resize(192, 192)
      .png()
      .toFile(join(publicDir, "android-chrome-192x192.png"));
    console.log("✓ android-chrome-192x192.png généré");

    await sharp(Buffer.from(svgWithBackground))
      .resize(512, 512)
      .png()
      .toFile(join(publicDir, "android-chrome-512x512.png"));
    console.log("✓ android-chrome-512x512.png généré");

    // Mstile pour Windows
    await sharp(Buffer.from(svgWithBackground))
      .resize(150, 150)
      .png()
      .toFile(join(publicDir, "mstile-150x150.png"));
    console.log("✓ mstile-150x150.png généré");

    console.log("\n✅ Toutes les icônes ont été générées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la génération des icônes:", error);
    process.exit(1);
  }
}

generateIcons();
