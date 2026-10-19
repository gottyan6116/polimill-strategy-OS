-- Fictional planning hypotheses only. These are not Polimill actuals or targets.
INSERT INTO organizations VALUES ('org-demo','Polimill（仮説組織）');
INSERT INTO departments VALUES
('dept-product','org-demo','プロダクト部門','誰もが社会の意思決定に参加できる体験をつくる','プロダクト責任者（仮）'),
('dept-growth','org-demo','事業開発部門','自治体との共創を、持続可能な事業に育てる','事業開発責任者（仮）'),
('dept-community','org-demo','コミュニティ部門','多様な声が届き、対話が続く場を育てる','コミュニティ責任者（仮）'),
('dept-corporate','org-demo','コーポレート部門','挑戦を支える、しなやかな組織基盤をつくる','管理責任者（仮）');
INSERT INTO goals (id,department_id,title,hypothesis,owner) VALUES
('goal-ux','dept-product','市民参加の体験を、もっと身近に','初回参加までの手順を短くすれば、継続的な参加につながる。','プロダクト責任者（仮）'),
('goal-quality','dept-product','安心して使い続けられる品質へ','利用者の声を毎週改善に取り込むことで、満足度が向上する。','品質担当（仮）'),
('goal-partner','dept-growth','自治体との共創を広げる','小規模な実証と成果共有により、継続導入の意思決定が進む。','事業開発責任者（仮）'),
('goal-community','dept-community','対話が続くコミュニティをつくる','テーマごとの対話機会を増やすことで、月間参加者が増加する。','コミュニティ責任者（仮）'),
('goal-team','dept-corporate','チームの実行力を高める','部門横断の目標共有を習慣化すると、施策の実行が加速する。','管理責任者（仮）');
INSERT INTO kpis (id,goal_id,name,actual,target,unit,direction) VALUES
('kpi-participation','goal-ux','月間アクティブ参加者',7800,10000,'人','up'),
('kpi-onboarding','goal-ux','初回参加完了率',72,85,'%','up'),
('kpi-satisfaction','goal-quality','利用者満足度',84,90,'%','up'),
('kpi-partners','goal-partner','実証パートナー自治体',18,24,'団体','up'),
('kpi-retention','goal-community','翌月継続参加率',62,75,'%','up'),
('kpi-review','goal-team','月次目標レビュー実施率',80,100,'%','up');
INSERT INTO kpi_history VALUES
('kpi-participation','2026-04',4200),('kpi-participation','2026-05',4900),('kpi-participation','2026-06',5300),('kpi-participation','2026-07',6100),('kpi-participation','2026-08',6700),('kpi-participation','2026-09',7300),('kpi-participation','2026-10',7800),
('kpi-onboarding','2026-04',54),('kpi-onboarding','2026-05',58),('kpi-onboarding','2026-06',61),('kpi-onboarding','2026-07',65),('kpi-onboarding','2026-08',68),('kpi-onboarding','2026-09',70),('kpi-onboarding','2026-10',72),
('kpi-satisfaction','2026-04',71),('kpi-satisfaction','2026-05',73),('kpi-satisfaction','2026-06',75),('kpi-satisfaction','2026-07',78),('kpi-satisfaction','2026-08',80),('kpi-satisfaction','2026-09',82),('kpi-satisfaction','2026-10',84),
('kpi-partners','2026-04',8),('kpi-partners','2026-05',9),('kpi-partners','2026-06',11),('kpi-partners','2026-07',12),('kpi-partners','2026-08',14),('kpi-partners','2026-09',16),('kpi-partners','2026-10',18),
('kpi-retention','2026-04',42),('kpi-retention','2026-05',46),('kpi-retention','2026-06',51),('kpi-retention','2026-07',54),('kpi-retention','2026-08',57),('kpi-retention','2026-09',60),('kpi-retention','2026-10',62),
('kpi-review','2026-04',30),('kpi-review','2026-05',40),('kpi-review','2026-06',45),('kpi-review','2026-07',60),('kpi-review','2026-08',65),('kpi-review','2026-09',75),('kpi-review','2026-10',80);
INSERT INTO initiatives (id,goal_id,title,owner,progress,status,due_date) VALUES
('init-onboarding','goal-ux','初回参加フローの改善','プロダクトチーム（仮）',80,'active','2026-11-30'),
('init-research','goal-ux','参加者インタビューと仮説検証','リサーチ担当（仮）',45,'active','2026-12-15'),
('init-access','goal-quality','アクセシビリティ点検','品質チーム（仮）',60,'active','2026-11-15'),
('init-pilot','goal-partner','自治体向け実証プログラム設計','事業開発チーム（仮）',35,'blocked','2026-12-31'),
('init-dialogue','goal-community','テーマ別対話会の試行','コミュニティチーム（仮）',100,'done','2026-10-15'),
('init-review','goal-team','月次レビューの共通フォーマット整備','管理チーム（仮）',20,'planned','2026-11-30');
