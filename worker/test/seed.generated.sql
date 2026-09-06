DELETE FROM changes;
DELETE FROM scan_errors;
DELETE FROM runs;
DELETE FROM parts;
DELETE FROM price_history;
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('ecs:FTP-CP-01', 'ecs', 'ECS Tuning', 'https://example.test/FTP-CP-01', 'FTP Motorsport B58 Charge Pipe', 'FTP Motorsport', 'FTP-CP-01', 329.99, 'USD', 'InStock', 'chargepipe_intercooler', '["b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-08-31T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:FTP-CP-01', '2026-08-06', 356.39);
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:FTP-CP-01', '2026-09-05', 329.99);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('ecs:WAG-IC-58', 'ecs', 'ECS Tuning', 'https://example.test/WAG-IC-58', 'Wagner Tuning Competition Intercooler', 'Wagner Tuning', 'WAG-IC-58', 1249, 'USD', 'InStock', 'chargepipe_intercooler', '["b58_gen1","b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-05T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:WAG-IC-58', '2026-08-06', 1348.92);
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:WAG-IC-58', '2026-09-05', 1249);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('ecs:BM3-B58', 'ecs', 'ECS Tuning', 'https://example.test/BM3-B58', 'bootmod3 B58 Licence', 'proTuningFreaks', 'BM3-B58', 595, 'USD', 'InStock', 'tune', '["b58_gen1","b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-08-31T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:BM3-B58', '2026-08-06', 642.60);
INSERT INTO price_history (part_id, date, price) VALUES ('ecs:BM3-B58', '2026-09-05', 595);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('fcp:MHD-SUP', 'fcp', 'FCP Euro', 'https://example.test/MHD-SUP', 'MHD Flasher Super Licence', 'MHD Tuning', 'MHD-SUP', 490, 'USD', 'InStock', 'tune', '["b58_gen1","b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-08-31T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:MHD-SUP', '2026-08-06', 529.20);
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:MHD-SUP', '2026-09-05', 490);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('fcp:BMW-PLUG-6', 'fcp', 'FCP Euro', 'https://example.test/BMW-PLUG-6', 'Genuine BMW Spark Plug Set', 'BMW', 'BMW-PLUG-6', 128.4, 'USD', 'InStock', NULL, '["b58_gen1","b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-03T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:BMW-PLUG-6', '2026-08-06', 138.67);
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:BMW-PLUG-6', '2026-09-05', 128.4);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('fcp:XHP-ZF8', 'fcp', 'FCP Euro', 'https://example.test/XHP-ZF8', 'xHP Flashtool ZF8 Stage 3', 'xHP', 'XHP-ZF8', 350, 'USD', 'InStock', 'drivetrain', '["b58_gen2"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-04T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:XHP-ZF8', '2026-08-06', 378.00);
INSERT INTO price_history (part_id, date, price) VALUES ('fcp:XHP-ZF8', '2026-09-05', 350);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('z1:Z1-DP-30', 'z1', 'Z1 Motorsports', 'https://example.test/Z1-DP-30', 'Z1 VR30 Catless Downpipes', 'Z1 Motorsports', 'Z1-DP-30', 1095, 'USD', 'InStock', 'downpipe', '["vr30_redsport","vr30_luxe"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-05T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('z1:Z1-DP-30', '2026-08-06', 1182.60);
INSERT INTO price_history (part_id, date, price) VALUES ('z1:Z1-DP-30', '2026-09-05', 1095);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('z1:AMS-IC-30', 'z1', 'Z1 Motorsports', 'https://example.test/AMS-IC-30', 'AMS Alpha VR30 Intercoolers', 'AMS Performance', 'AMS-IC-30', 1495, 'USD', 'InStock', 'chargepipe_intercooler', '["vr30_redsport"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-02T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('z1:AMS-IC-30', '2026-08-06', 1614.60);
INSERT INTO price_history (part_id, date, price) VALUES ('z1:AMS-IC-30', '2026-09-05', 1495);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('z1:Z1-INT-37', 'z1', 'Z1 Motorsports', 'https://example.test/Z1-INT-37', 'Z1 370Z High Flow Intake', 'Z1 Motorsports', 'Z1-INT-37', 449.99, 'USD', 'InStock', 'intake', '["vq37vhr"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-08-31T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('z1:Z1-INT-37', '2026-08-06', 485.99);
INSERT INTO price_history (part_id, date, price) VALUES ('z1:Z1-INT-37', '2026-09-05', 449.99);
INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES ('z1:STL-HDR-37', 'z1', 'Z1 Motorsports', 'https://example.test/STL-HDR-37', 'Stillen VQ37 Long Tube Headers', 'Stillen', 'STL-HDR-37', 1799, 'USD', 'InStock', 'exhaust', '["vq37vhr"]', '2026-08-06T23:57:55.012Z', '2026-09-05T23:57:55.012Z', '2026-09-01T23:57:55.012Z');
INSERT INTO price_history (part_id, date, price) VALUES ('z1:STL-HDR-37', '2026-08-06', 1942.92);
INSERT INTO price_history (part_id, date, price) VALUES ('z1:STL-HDR-37', '2026-09-05', 1799);
INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit, scanned, unchanged, added_count, changed_count, removed_count, error_count, stopped_reason, queued_next, by_vendor, ingested_at)
     VALUES ('2026-09-05T0800', '2026-09-05', '2026-09-05T23:57:55.012Z', '2026-09-05T23:57:55.012Z', 786000, 97, 100, 88, 83, 2, 3, 1, 1, 'budget', 412, '{"ecs":{"requests":33,"scanned":30,"added":1,"changed":1,"removed":0},"fcp":{"requests":32,"scanned":29,"added":1,"changed":1,"removed":1},"z1":{"requests":32,"scanned":29,"added":0,"changed":1,"removed":0}}', '2026-09-05T23:57:55.012Z');
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'added', 'ecs:FTP-CP-01', 'ecs', 'ECS Tuning', 'FTP Motorsport B58 Charge Pipe', 'https://example.test/FTP-CP-01', 'FTP-CP-01', 329.99, '["b58_gen2"]', NULL);
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'added', 'z1:AMS-IC-30', 'z1', 'Z1 Motorsports', 'AMS Alpha VR30 Intercoolers', 'https://example.test/AMS-IC-30', 'AMS-IC-30', 1495, '["vr30_redsport"]', NULL);
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'changed', 'z1:Z1-DP-30', 'z1', 'Z1 Motorsports', 'Z1 VR30 Catless Downpipes', 'https://example.test/Z1-DP-30', 'Z1-DP-30', 1095, '["vr30_redsport","vr30_luxe"]', '[{"field":"price","from":1195,"to":1095},{"field":"availability","from":"OutOfStock","to":"InStock"}]');
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'changed', 'ecs:WAG-IC-58', 'ecs', 'ECS Tuning', 'Wagner Tuning Competition Intercooler', 'https://example.test/WAG-IC-58', 'WAG-IC-58', 1249, '["b58_gen1","b58_gen2"]', '[{"field":"price","from":1199,"to":1249}]');
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'changed', 'fcp:BMW-PLUG-6', 'fcp', 'FCP Euro', 'Genuine BMW Spark Plug Set', 'https://example.test/BMW-PLUG-6', 'BMW-PLUG-6', 128.4, '["b58_gen1","b58_gen2"]', '[{"field":"availability","from":"InStock","to":"BackOrder"}]');
INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES ('2026-09-05T0800', 'removed', 'z1:STL-HDR-37', 'z1', 'Z1 Motorsports', 'Stillen VQ37 Long Tube Headers', 'https://example.test/STL-HDR-37', 'STL-HDR-37', 1799, '["vq37vhr"]', NULL);
INSERT INTO scan_errors (run_id, url, reason) VALUES ('2026-09-05T0800', 'https://example.test/timeout-page', 'listing returned HTTP 503');
INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit, scanned, unchanged, added_count, changed_count, removed_count, error_count, stopped_reason, queued_next, by_vendor, ingested_at)
     VALUES ('2026-09-04T0800', '2026-09-04', '2026-09-04T23:57:55.012Z', '2026-09-04T23:57:55.012Z', 786000, 100, 100, 94, 87, 6, 1, 0, 0, 'budget', 498, '{"ecs":{"requests":33,"scanned":30,"added":1,"changed":1,"removed":0},"fcp":{"requests":32,"scanned":29,"added":1,"changed":1,"removed":1},"z1":{"requests":32,"scanned":29,"added":0,"changed":1,"removed":0}}', '2026-09-04T23:57:55.012Z');
INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit, scanned, unchanged, added_count, changed_count, removed_count, error_count, stopped_reason, queued_next, by_vendor, ingested_at)
     VALUES ('2026-09-03T0800', '2026-09-03', '2026-09-03T23:57:55.012Z', '2026-09-03T23:57:55.012Z', 786000, 100, 100, 91, 80, 11, 0, 0, 2, 'budget', 587, '{"ecs":{"requests":33,"scanned":30,"added":1,"changed":1,"removed":0},"fcp":{"requests":32,"scanned":29,"added":1,"changed":1,"removed":1},"z1":{"requests":32,"scanned":29,"added":0,"changed":1,"removed":0}}', '2026-09-03T23:57:55.012Z');
INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit, scanned, unchanged, added_count, changed_count, removed_count, error_count, stopped_reason, queued_next, by_vendor, ingested_at)
     VALUES ('2026-09-02T0800', '2026-09-02', '2026-09-02T23:57:55.012Z', '2026-09-02T23:57:55.012Z', 786000, 43, 100, 38, 0, 38, 0, 0, 0, 'queue-empty', 0, '{"ecs":{"requests":33,"scanned":30,"added":1,"changed":1,"removed":0},"fcp":{"requests":32,"scanned":29,"added":1,"changed":1,"removed":1},"z1":{"requests":32,"scanned":29,"added":0,"changed":1,"removed":0}}', '2026-09-02T23:57:55.012Z');