# Data Dictionary – WA Major Resources Projects

## Purpose
This document describes the structure, meaning, and data quality characteristics of the
Major Resources Projects dataset used in the WA Mining Operations Dashboard. It serves
as a reference for data analysts, BI developers, and stakeholders reviewing the project.

## Overview
| Attribute | Detail |
| :--- | :--- |
| Source | WA Open Data Portal – Major Resources Projects |
| Download date | 16 May 2026 |
| Snapshot year | 2023–24 |
| Total fields | 19 |
| Primary key | SITE_CODE (unique per site) |
| Relationship | Multiple sites map to one project (PROJ_CODE) |


## Fields

| Field | Description | Example |
|-------|-------------|---------|
| SITE_CODE | Unique identifier for each site (mine, infrastructure, etc.) | S0001709 |
| TITLE | Human-readable site name | Fortnum |
| SHORT_TITLE | Abbreviated site name | Fortnum |
| PROJ_CODE | Project identifier linking multiple sites to one project | J00772 |
| PROJECT_TITLE | Project-level name | Karlawinda Gold |
| SITE_TYPE | High-level classification of the site | Mine, Infrastructure, Other |
| SUB_TYPE | Detailed type within the site | Openpit, Decline, Power Plant, Port |
| STAGE | Project development and operating status | Operating, Proposed, Under Development, Care and Maintenance |
| COMMODITIES | Detailed commodity codes produced | Fe, Au Ag, REE Ce La Nd Sm Gd Eu Y Pr Dy Tb Er Ho Tm Yb |
| COMMODITY_GROUP_NAME | Broad commodity group | Precious metal, Steel alloy metal, Industrial mineral |
| TARGET_GROUP_NAME | Cleaned commodity category used in maps and reporting | GOLD, IRON ORE, NICKEL, POTASH, HEAVY MINERAL SANDS |
| DEVELOPMENT_REGION | WA development region for the site | PILBARA, Development Region; GOLDFIELDS-ESPERANCE, Development Region |
| LGA_NAME | Local government area | EAST PILBARA, SHIRE OF; ALBANY, CITY OF |
| ACTIVE_FLAG | Y/N – whether site is currently active as a principal project | Y, N |
| SYMBOL_STATUS | Status code used for map symbols | O (Operating), P (Proposed), U (Under Development), C (Care and Maintenance) |
| MAP_SERIES | Map series classification | Major Projects |
| LONGITUDE | Geographic longitude coordinate | 118.452 |
| LATITUDE | Geographic latitude coordinate | -20.631 |
| EXTRACT_DATE | Snapshot date of the dataset | 20260515 |

## Data Quality Notes

1. **No explicit capital cost field** – This dataset does not contain a capital_cost column. Capital analysis must use other WA sources or be treated as out of scope for v1.

2. **Inconsistent region labels** – DEVELOPMENT_REGION and LGA_NAME values include suffix text such as ", Development Region" and ", SHIRE OF / CITY OF". These require cleaning or standardisation before aggregation.

3. **Status duplication** – Both STAGE and SYMBOL_STATUS encode operational status. For v1, STAGE is used as the primary status dimension; SYMBOL_STATUS is retained only for cross-checking.

4. **Multi-site projects** – Several SITE_CODEs share the same PROJ_CODE (e.g. mine and associated power plant or port). This requires a decision on whether to analyse at site level or project level to avoid double-counting.

5. **Complex commodity lists** – Some COMMODITIES values contain long lists, especially for rare earths and multi-commodity projects. For v1, TARGET_GROUP_NAME is used for clean commodity grouping.