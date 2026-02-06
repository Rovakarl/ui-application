/**
 * Script pour télécharger OpenCV.js localement
 * 
 * Usage: node scripts/download-opencv.js
 * 
 * Ce script télécharge OpenCV.js depuis le CDN officiel
 * et le place dans assets/opencv.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OPENCV_URL = 'https://docs.opencv.org/4.5.0/opencv.js';
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'opencv.js');

console.log('📥 Téléchargement d\'OpenCV.js...');
console.log(`📍 URL: ${OPENCV_URL}`);
console.log(`💾 Destination: ${OUTPUT_PATH}`);

// Créer le dossier assets s'il n'existe pas
const assetsDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const file = fs.createWriteStream(OUTPUT_PATH);

https.get(OPENCV_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Erreur: ${response.statusCode}`);
    process.exit(1);
  }

  const totalSize = parseInt(response.headers['content-length'], 10);
  let downloadedSize = 0;

  response.on('data', (chunk) => {
    downloadedSize += chunk.length;
    const percent = ((downloadedSize / totalSize) * 100).toFixed(2);
    process.stdout.write(`\r📊 Progression: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    const fileSize = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Téléchargement terminé !`);
    console.log(`📦 Taille du fichier: ${fileSize} MB`);
    console.log(`\n💡 Pour utiliser ce fichier localement, modifiez ui/web-view.tsx`);
    console.log(`   pour injecter le contenu du fichier au lieu d'utiliser le CDN.`);
  });
}).on('error', (err) => {
  console.error(`❌ Erreur lors du téléchargement: ${err.message}`);
  fs.unlink(OUTPUT_PATH, () => {}); // Supprimer le fichier partiel
  process.exit(1);
});
