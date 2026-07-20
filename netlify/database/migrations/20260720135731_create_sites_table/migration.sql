CREATE TABLE "sites" (
	"site_code" text PRIMARY KEY,
	"project_code" text,
	"project_title" text,
	"title" text,
	"short_title" text,
	"site_type" text,
	"subtype" text,
	"stage" text,
	"target_group_name" text,
	"commodity_group_name" text,
	"development_region" text,
	"lga_name" text,
	"longitude" numeric(10,6),
	"latitude" numeric(10,6),
	"active_flag" text
);
