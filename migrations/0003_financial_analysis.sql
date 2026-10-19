-- Fictional financial model; all money values are JPY millions.
CREATE TABLE finance_business_units (
 id TEXT PRIMARY KEY,
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 name TEXT NOT NULL,
 color TEXT NOT NULL
);
CREATE TABLE finance_periods (
 id TEXT PRIMARY KEY,
 business_unit_id TEXT NOT NULL REFERENCES finance_business_units(id),
 fiscal_year INTEGER NOT NULL,
 revenue REAL NOT NULL CHECK(revenue>=0),
 cost_of_sales REAL NOT NULL CHECK(cost_of_sales>=0),
 sga REAL NOT NULL CHECK(sga>=0),
 tax_rate REAL NOT NULL CHECK(tax_rate BETWEEN 0 AND 1),
 opening_invested_capital REAL NOT NULL CHECK(opening_invested_capital>=0),
 opening_assets REAL NOT NULL CHECK(opening_assets>=0),
 opening_cash REAL NOT NULL CHECK(opening_cash>=0),
 receivables REAL NOT NULL CHECK(receivables>=0),
 inventory REAL NOT NULL CHECK(inventory>=0),
 payables REAL NOT NULL CHECK(payables>=0),
 fixed_assets REAL NOT NULL CHECK(fixed_assets>=0),
 short_term_debt REAL NOT NULL CHECK(short_term_debt>=0),
 long_term_debt REAL NOT NULL CHECK(long_term_debt>=0),
 operating_cf REAL NOT NULL,
 investing_cf REAL NOT NULL,
 financing_cf REAL NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(business_unit_id,fiscal_year),
 CHECK(opening_cash+operating_cf+investing_cf+financing_cf>=0)
);
CREATE INDEX finance_units_org ON finance_business_units(organization_id);
CREATE INDEX finance_periods_unit_year ON finance_periods(business_unit_id,fiscal_year);
INSERT INTO finance_business_units VALUES
 ('business-civic','org-demo','市民参画SaaS（仮）','#1aada5'),
 ('business-dx','org-demo','自治体DX支援（仮）','#4a86c5'),
 ('business-research','org-demo','共創リサーチ（仮）','#d8934a');

INSERT INTO finance_periods (id,business_unit_id,fiscal_year,revenue,cost_of_sales,sga,tax_rate,opening_invested_capital,opening_assets,opening_cash,receivables,inventory,payables,fixed_assets,short_term_debt,long_term_debt,operating_cf,investing_cf,financing_cf) VALUES
('business-civic-2024','business-civic',2024,180,60,95,0.3,110,150,35,35,0,15,90,15,40,20,-15,5),
('business-civic-2025','business-civic',2025,240,75,110,0.3,110,170,45,45,0,18,105,12,35,45,-20,-5),
('business-civic-2026','business-civic',2026,320,95,135,0.3,132,215,65,60,0,24,125,10,25,70,-30,-10),
('business-dx-2024','business-dx',2024,120,65,42,0.3,65,90,18,25,2,18,50,8,25,9,-8,0),
('business-dx-2025','business-dx',2025,155,82,50,0.3,59,96,19,32,3,22,58,8,25,18,-12,0),
('business-dx-2026','business-dx',2026,180,95,65,0.3,71,118,25,40,3,26,65,6,22,25,-15,-3),
('business-research-2024','business-research',2024,45,22,30,0.3,35,60,15,10,0,5,30,5,18,-8,-3,15),
('business-research-2025','business-research',2025,55,26,32,0.3,35,59,19,12,0,6,35,5,24,-3,-4,10),
('business-research-2026','business-research',2026,80,35,38,0.3,41,69,22,17,0,8,38,5,22,7,-5,0);
