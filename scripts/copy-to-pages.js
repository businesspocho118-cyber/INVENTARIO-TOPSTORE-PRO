const fs = require("fs");
const path = require("path");

const src = path.join(process.cwd(), ".open-next");
const dst = path.join(process.cwd(), ".open-next-pages", "_worker.js");

// Clean destination
fs.rmSync(path.join(process.cwd(), ".open-next-pages"), {
  recursive: true,
  force: true,
});

// Recursive copy skipping node_modules
function copyDir(srcDir, dstDir) {
  try {
    fs.mkdirSync(dstDir, { recursive: true });
  } catch {}
  for (const entry of fs.readdirSync(srcDir)) {
    if (entry === "node_modules") continue;
    const sp = path.join(srcDir, entry);
    const dp = path.join(dstDir, entry);
    try {
      const stat = fs.statSync(sp);
      if (stat.isDirectory()) {
        copyDir(sp, dp);
      } else {
        fs.copyFileSync(sp, dp);
      }
    } catch (err) {
      console.error("  skip:", entry, err.message);
    }
  }
}

copyDir(src, dst);

// Rename worker.js → index.js inside _worker.js
fs.renameSync(path.join(dst, "worker.js"), path.join(dst, "index.js"));

console.log("✓ Pages output ready at .open-next-pages");