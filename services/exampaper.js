"use strict";

const createExamPaperService = ({ fs, path, spawn, io }) => {
  const JOB_TTL_MS = 60 * 60 * 1000;
  const jobs = new Map();

  const emitJob = (jobId, event, payload) => {
    io.to(jobId).emit(event, payload);
  };

  const cleanupJob = (jobId) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (job.tmpDir && fs.existsSync(job.tmpDir)) {
      try {
        fs.rmSync(job.tmpDir, { recursive: true, force: true });
      } catch {}
    }
    jobs.delete(jobId);
  };

  io.on("connection", (socket) => {
    socket.on("job:join", (jobId) => {
      if (jobId) socket.join(jobId);
    });
  });

  const mergePdfs = async (outputPath, inputPaths) => {
    if (!inputPaths.length) return { ok: false, error: "Nessun PDF da unire" };
    const tryPdfunite = () =>
      new Promise((resolve) => {
        const proc = spawn("pdfunite", [...inputPaths, outputPath]);
        proc.on("close", (code) => resolve(code === 0));
        proc.on("error", () => resolve(false));
      });
    const tryGhostscript = () =>
      new Promise((resolve) => {
        const args = [
          "-dBATCH",
          "-dNOPAUSE",
          "-sDEVICE=pdfwrite",
          `-sOutputFile=${outputPath}`,
          ...inputPaths,
        ];
        const proc = spawn("gs", args);
        proc.on("close", (code) => resolve(code === 0));
        proc.on("error", () => resolve(false));
      });
    if (await tryPdfunite()) return { ok: true };
    if (await tryGhostscript()) return { ok: true };
    return { ok: false, error: "pdfunite/gs non disponibili per unire i PDF" };
  };

  return {
    JOB_TTL_MS,
    jobs,
    emitJob,
    cleanupJob,
    mergePdfs,
  };
};

module.exports = createExamPaperService;
