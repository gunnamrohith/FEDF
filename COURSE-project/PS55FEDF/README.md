# Lab Test Ordering & Results Portal (React)

This project is now implemented with React modules and Vite, with a standard npm workflow.

## Features

- Medical report upload and analysis (PDF, DOCX, TXT)
- Wellness score, findings, and food guidance
- Visual analytics with charts
- Lab test catalogue
- Test order creation and history tracking
- Result attachment and doctor review notes
- Summary download for analysis and order records

## Tech Stack

- React 18 + Vite
- JavaScript ES modules
- Bootstrap 5
- Chart.js
- Mammoth
- pdfjs-dist

## Run Locally

```bash
cd /Users/g.rohith/Desktop/PS55FEDF
npm install
npm run dev
```

Open the URL shown in terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Notes

- This tool is educational and not a medical diagnosis system.
- Legacy `.doc` files are not supported by browsers directly.
- Current persistence is LocalStorage (frontend-only implementation).
