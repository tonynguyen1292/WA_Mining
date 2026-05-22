# WA Mining Operations Dashboard

## Project Overview
This project analyses Western Australia's public **Major Resources Projects** dataset to understand how major mining and resources projects are distributed by commodity, region, status, and company.

## Business Problem
Stakeholders in WA's resources sector rely on static reports to monitor project pipelines. This dashboard consolidates project data into an interactive view that answers key portfolio questions.

## Tech Stack
- **Notion** – documentation, requirements, case study
- **PostgreSQL + SQL** – data modeling and queries
- **Power BI** – dashboard and visual analytics
- **GitHub** – code, queries, and documentation
- **Jira** – user stories and task tracking

## Repo Structure
WA_Mining/
├── README.md
├── .gitignore
├── DATABASES/
│   ├── raw/
│   │   └── Major_Resource_Projects.csv
│   └── README_DATA.md
├── DOCUMENTS/
│   ├── METADATA/
│   │   ├── MINEDEX_Major_Resource_Projects_Map_DataDictionary_GDA2020.pdf
│   │   ├── MINEDEX_Major_Resource_Projects_Map_Metadata_GDA2020
│   │   └── Licence_CCBY4.pdf
├── SQL/
│   ├── 01_create_raw_table.sql
│   ├── 02_create_clean_table.sql
│   ├── 03_insert_cleaned_data.sql
│   ├── 04_create_summary_view.sql
│   └── 05_portfolio_summary.sql
├── POWER_BI/
│   ├── wa_mining_dashboard_v1.pbix
│   ├── wa_mining_dashboard_v2.pbix
│   └── screenshots/
│       ├── dashboard-overview.png
│       └── dashboard-regional-analysis.png
└── data_dictionary.md

## Key Context (WA 2024–25)
- 139 principal mining projects – the highest on record since 2014–15.
- 49 gold, 36 iron ore, 11 nickel, 7 lithium projects.
- 16 major mineral processing operations and 20 petroleum projects across 50 fields.

## Data Source
- WA Open Data Portal – [Major Resources Projects](https://data.wa.gov.au)
- WA Govt – [Western Australia's Principal Resource Projects](https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/western-australias-principal-resource-projects)
- The PostgreSQL database is the primary working environment for this project. The raw CSV and SQL scripts are the source of truth for reproducing the analytical model.

## Links
- [Notion Case Study](https://www.notion.so/WA-Mining-Operations-Dashboard-Business-Analyst-Portfolio-Project-35fd7e4273f0809ba6cecc2f77d9aa5f)
- [WA 7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202)
- [WA Mining Portfolio - Instructions](https://www.notion.so/WA-Mining-Portfolio-Instructions-363d7e4273f08052844def6827925a8c)

## Power BI Dashboard 
The Power BI dashboard consists of **two pages** designed for quick exploration and regional drill-down.
**Page 1: Overview**

Purpose: Provide a high-level snapshot of the entire WA major resource portfolio
![alt text](image.png)

**Page 2: Regional and Operational View**

Purpose: Enable deeper exploration by region, project, and site type
![alt text](image-1.png)

wa_mining_dashboard_v2.pbix is the final version of the dashboard as it updates the name of developement_region and lga_name without the suffixes.

## Key Insights

- **Commodity Concentration:** Gold projects represent ~47% of the mining portfolio (65 of 139 projects), creating significant price exposure that stakeholders should monitor.
- **Regional Clustering:** Projects concentrate in the Pilbara (iron ore), Goldfields (gold, lithium), and Mid West (nickel, mineral sands), informing infrastructure and logistics planning.
- **Pipeline Growth:** 139 mining projects in 2024-25 is the highest on record since 2014-15, signaling strong capital deployment despite near-term commodity headwinds.
- **Value Chain Visibility:** Separating Mine, Infrastructure, and Deposit site types enables stakeholders to assess whether downstream capacity is keeping pace with upstream development.

## Data Modeling Decisions

- **Grain:** Site-level modeling chosen to preserve operational asset granularity; multiple sites can map to a single project code.
- **Schema:** Single flat table in Import mode — no star schema required given snapshot data grain.
- **Primary commodity dimension:** `TARGET_GROUP_NAME` used over raw `COMMODITIES` field (complex multi-value list).
- **DAX measures** replicate SQL `portfolio_summary` logic using COUNT/CASE patterns ported to Power BI DAX.
- **Slicers:** Commodity, Region, Stage, and Company configured for interactive cross-filtering.

## Reproducibility Path (showed in WA Mining Portfolio - Instructions)
1. Install PostgreSQL.

2. Create a database called wa_mining.

3. Load the raw CSV.

4. Run SQL scripts in order.

5. Open the Power BI file and refresh the connection.

## Challenges and Fixes

| Challenge | Fix |
|---|---|
| Mixed asset types (mining, processing, petroleum) in single source | Segmented via `TARGET_GROUP_NAME` and `SITE_TYPE`; documented in data dictionary |
| Multi-commodity fields with pipe-delimited lists | Used cleaned `TARGET_GROUP_NAME` single-value dimension |
| Region/LGA names with inconsistent suffixes (e.g., "SHIRE OF") | Power Query text transformations + manual mapping |
| Site-to-project duplicate counting | DISTINCTCOUNT for projects, COUNTROWS for sites — both measures exposed in KPI cards |