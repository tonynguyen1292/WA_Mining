# WA Mining Operations Dashboard

## Project Overview
This project analyses Western Australia's public **Major Resources Projects** dataset to understand how major mining and resources projects are distributed by commodity, region, status, and company.

## Business Problem
Stakeholders in WA's resources sector rely on static reports to monitor project pipelines. This dashboard consolidates project data into an interactive view that answers key portfolio questions.

## Tech Stack
- **Notion** – documentation, requirements, case study
- **SQL (SQLite)** – data modeling and queries
- **Power BI** – dashboard and visual analytics
- **GitHub** – code, queries, and documentation
- **Jira** – user stories and task tracking

## Repo Structure
WA_Mining/
    |-DATABASES/ # Raw data downloaded separatedly from WA Open Data Portal, description files regarding the dataset are in this directory.
    |- DOCUMENTS/ # BA artifacts, metadata, license
    |- SQL/ # Schema and business queries
    |- POWER_BI/ # Dashboard screenshots
    |- README.md  
    |- .gitignore 
    |- data_dictionary 

## Key Context (WA 2023–24)
- 138 principal mining projects – the highest on record since 2014–15.
- 49 gold, 36 iron ore, 11 nickel, 7 lithium projects.
- 16 major mineral processing operations and 20 petroleum projects across 50 fields.

## Data Source
- WA Open Data Portal – [Major Resources Projects](https://data.wa.gov.au)
- WA Govt – [Western Australia's Principal Resource Projects](https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/western-australias-principal-resource-projects)

## Links
- [Notion Case Study](https://www.notion.so/WA-Mining-Operations-Dashboard-Business-Analyst-Portfolio-Project-35fd7e4273f0809ba6cecc2f77d9aa5f)
- [WA 7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202)

## Power BI Dashboard 
The Power BI dashboard consists of **two pages** designed for quick exploration and regional drill-down.
**Page 1: Overview**

Purpose: Provide a high-level snapshot of the entire WA major resource portfolio
![alt text](<Overview Dashboard - Screenshot - 18052026.png>)

**Page 2: Regional and Operational View**

Purpose: Enable deeper exploration by region, project, and site type
![alt text](<Regional and Overview - Screenshot - 18052026.png>)