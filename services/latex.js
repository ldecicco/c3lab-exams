"use strict";

const { spawnSync } = require("child_process");

const createLatexService = ({ fs, path, spawn, baseDir }) => {
  const normalizeAssetPath = (assetPath) => {
    const raw = String(assetPath || "").trim().replace(/\\/g, "/");
    if (!raw) return "";
    if (path.isAbsolute(raw)) return raw;
    return raw.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
  };

  const normalizeLatexAssetReferences = (latex) => {
    const input = String(latex || "");
    const normalizedGraphics = input.replace(
      /(\\includegraphics(?:\[[^\]]*\])?{)([^}]+)(})/g,
      (_m, p1, p2, p3) => `${p1}${normalizeAssetPath(p2)}${p3}`
    );
    return normalizedGraphics.replace(
      /(\\newcommand\{\\examlogo\}\{)([^}]+)(})/g,
      (_m, p1, p2, p3) => `${p1}${normalizeAssetPath(p2)}${p3}`
    );
  };

  const collectLatexAssets = (latex) => {
    const assets = new Set();
    const includeRe = /\\includegraphics(?:\[[^\]]*\])?{([^}]+)}/g;
    let match = includeRe.exec(latex);
    while (match) {
      assets.add(normalizeAssetPath(match[1]));
      match = includeRe.exec(latex);
    }
    const logoMatch = latex.match(/\\newcommand\{\\examlogo\}\{([^}]+)}/);
    if (logoMatch && logoMatch[1]) assets.add(normalizeAssetPath(logoMatch[1]));
    return Array.from(assets);
  };

  const convertEpsToPdf = (srcPath, outPath) => {
    const commands = [
      { cmd: "repstopdf", args: ["--outfile", outPath, srcPath] },
      { cmd: "epstopdf", args: ["--outfile", outPath, srcPath] },
    ];
    for (const { cmd, args } of commands) {
      const result = spawnSync(cmd, args, { stdio: "ignore" });
      if (result.status === 0 && fs.existsSync(outPath)) return true;
    }
    return false;
  };

  const copyLatexAssets = (assets, destDir) => {
    assets.forEach((asset) => {
      const clean = normalizeAssetPath(asset);
      if (!clean) return;
      const src = path.isAbsolute(clean) ? clean : path.join(baseDir, clean);
      if (!fs.existsSync(src)) return;
      const dest = path.join(destDir, clean);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);

      const ext = path.extname(dest).toLowerCase();
      if (ext === ".eps" || ext === ".ps") {
        const outPath = dest.replace(/\.(eps|ps)$/i, "-eps-converted-to.pdf");
        convertEpsToPdf(dest, outPath);
      }
    });
  };

  const runPdflatex = (outputDir, jobName, texArg, cwd = outputDir) =>
    new Promise((resolve) => {
      const args = [
        "-interaction=nonstopmode",
        "-halt-on-error",
        "-output-directory",
        outputDir,
        "-jobname",
        jobName,
        texArg,
      ];
      const pdflatex = spawn("pdflatex", args, { cwd });
      let stdout = "";
      let stderr = "";
      pdflatex.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      pdflatex.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      pdflatex.on("close", (code) => {
        const logPath = path.join(outputDir, `${jobName}.log`);
        const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
        resolve({
          ok: code === 0,
          stdout,
          stderr,
          log,
        });
      });
    });

  return {
    normalizeLatexAssetReferences,
    collectLatexAssets,
    copyLatexAssets,
    runPdflatex,
  };
};

module.exports = createLatexService;
