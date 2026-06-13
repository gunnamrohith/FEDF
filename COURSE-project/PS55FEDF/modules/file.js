const { SUPPORTED_EXTENSIONS: fileSupportedExtensions } = window.AppData;

function isSupportedFile(file) {
  const extension = file?.name?.toLowerCase().split(".").pop();
  return fileSupportedExtensions.has(extension);
}

async function extractTextFromFile(file) {
  const extension = file.name.toLowerCase().split(".").pop();

  if (extension === "txt") {
    return file.text();
  }

  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (extension === "pdf") {
    const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

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

window.AppFile = {
  extractTextFromFile,
  isSupportedFile
};
