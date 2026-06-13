import { SUPPORTED_EXTENSIONS } from "./data";

let mammothPromise;
let pdfjsPromise;

async function loadMammoth() {
  if (!mammothPromise) {
    mammothPromise = import("mammoth/mammoth.browser");
  }

  return mammothPromise;
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ]).then(([pdfjsLib, pdfWorker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
      return pdfjsLib;
    });
  }

  return pdfjsPromise;
}

export function isSupportedFile(file) {
  const extension = file?.name?.toLowerCase().split(".").pop();
  return SUPPORTED_EXTENSIONS.has(extension);
}

export async function extractTextFromFile(file) {
  const extension = file?.name?.toLowerCase().split(".").pop();

  if (extension === "txt") {
    return file.text();
  }

  if (extension === "docx") {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (extension === "pdf") {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += ` ${pageText}`;
    }

    return fullText;
  }

  throw new Error("Unsupported file type");
}
