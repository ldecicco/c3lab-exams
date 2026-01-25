"use strict";

const { spawnSync } = require("child_process");

const createThumbnailService = ({ fs, path }) => {
  const canThumbnailExtension = (ext) => [".pdf", ".ps", ".eps"].includes(ext);

  const generateThumbnail = (inputPath, destDir, baseName, ext = "") => {
    const thumbName = `${baseName}-thumb.png`;
    const thumbPath = path.join(destDir, thumbName);
    const cropFlags = [];
    if (ext === ".pdf") {
      cropFlags.push("-dUseCropBox");
    } else if (ext === ".eps" || ext === ".ps") {
      cropFlags.push("-dEPSCrop");
    }
    const args = [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-sDEVICE=pngalpha",
      "-r150",
      "-dFirstPage=1",
      "-dLastPage=1",
      ...cropFlags,
      `-sOutputFile=${thumbPath}`,
      inputPath,
    ];
    const result = spawnSync("gs", args, { stdio: "ignore" });
    if (result.status === 0 && fs.existsSync(thumbPath)) {
      return thumbPath;
    }
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    return null;
  };

  return {
    canThumbnailExtension,
    generateThumbnail,
  };
};

module.exports = createThumbnailService;
