# DATABASES

This folder is intentionally kept empty in the repository so the project structure stays clean and large source files do not need to be versioned. The CSV used for this project should be downloaded directly from the Department of Mines, Industry Regulation and Safety (DMIRS) Data and Software Centre, which provides MINEDEX downloads in CSV and other formats.

## Data source

Use the **MINEDEX Major Resource Projects** dataset from the DMIRS Data and Software Centre: [MINEDEX Major Resource Projects](https://dasc.dmirs.wa.gov.au/home?productAlias=MINEDEXMajorResProj).

## How to download the CSV

1. Open the dataset page linked above.
2. Locate **MINEDEX Major Resource Projects Map** and choose the **CSV** download option.
3. Download the file to your computer and extract it if it is provided as a compressed archive.
4. Move the extracted CSV file into this `DATABASES/` folder for local analysis and dashboard development.

## Why the CSV is not stored here

The repository's `DATABASES` folder currently contains only a placeholder file so the directory remains in Git. Keeping downloadable source data out of the repository avoids committing large or frequently updated files while still letting viewers reproduce the project with the official source dataset.

## Notes

- DMIRS states that MINEDEX is free to use and offers bulk downloads in multiple formats, including CSV.
- The Data and Software Centre updates dynamic datasets on a schedule, so viewers should download the latest available file from the source page rather than rely on a copy stored in the repository.