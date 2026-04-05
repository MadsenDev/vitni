-- Operation Circuit Ledger sample dataset
--
-- A larger synthetic cyber/financial showcase case for Vitni. This SQL file
-- mirrors the current schema (migrations 001-005), seeds representative data,
-- and marks the migrations as already applied so the project opens cleanly.
--
-- Create the database with:
--
--   sqlite3 db/case.sqlite < db/case.sqlite.sql

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS migration (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT,
  properties_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  pos_x REAL,
  pos_y REAL
);

CREATE TABLE IF NOT EXISTS edge (
  id TEXT PRIMARY KEY,
  src_id TEXT NOT NULL,
  dst_id TEXT NOT NULL,
  type TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(src_id) REFERENCES entity(id),
  FOREIGN KEY(dst_id) REFERENCES entity(id)
);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  locator TEXT NOT NULL,
  title TEXT,
  added_at INTEGER NOT NULL,
  hash TEXT,
  mime TEXT,
  folder_path TEXT,
  file_name TEXT,
  display_name TEXT,
  file_size INTEGER,
  modified_at INTEGER
);

CREATE TABLE IF NOT EXISTS assertion (
  id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  path TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source_id TEXT NOT NULL,
  confidence TEXT NOT NULL,
  review_state TEXT NOT NULL DEFAULT 'unreviewed',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES entity(id),
  FOREIGN KEY(source_id) REFERENCES source(id)
);

CREATE TABLE IF NOT EXISTS transform_run (
  id TEXT PRIMARY KEY,
  transform_id TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_summary TEXT,
  consent_snapshot_json TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  transform_run_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(transform_run_id) REFERENCES transform_run(id)
);

CREATE TABLE IF NOT EXISTS project_setting (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_type ON entity(type);
CREATE INDEX IF NOT EXISTS idx_edge_src ON edge(src_id);
CREATE INDEX IF NOT EXISTS idx_edge_dst ON edge(dst_id);
CREATE INDEX IF NOT EXISTS idx_assertion_subject ON assertion(subject_id);
CREATE INDEX IF NOT EXISTS idx_assertion_source ON assertion(source_id);
CREATE INDEX IF NOT EXISTS idx_assertion_review_state ON assertion(review_state);
CREATE INDEX IF NOT EXISTS idx_source_hash ON source(hash);
CREATE INDEX IF NOT EXISTS idx_source_folder_path ON source(folder_path);

INSERT INTO migration (id, name, applied_at) VALUES
  (1, '001_init.sql', 1775001600),
  (2, '002_add_entity_position.sql', 1775001600),
  (3, '003_add_project_settings.sql', 1775001600),
  (4, '004_add_source_file_fields.sql', 1775001600),
  (5, '005_add_media_library_fields.sql', 1775001600),
  (6, '006_add_assertion_review_fields.sql', 1775001600);

INSERT INTO entity (id, type, label, properties_json, created_at, updated_at, pos_x, pos_y) VALUES
  ('ent-case-circuit-ledger', 'case', 'Operation Circuit Ledger', '{"caseNumber":"NRR-2026-014","title":"Operation Circuit Ledger","caseType":"Compliance","status":"Active","priority":"Critical","assignedTo":"Dana Mercer","openedDate":"2026-03-21","description":"Suspected settlement diversion through a lookalike vendor portal and shell payout path.","notes":"Synthetic showcase case seeded for repo demos."}', 1774051200000, 1775001600000, 90, 220),
  ('ent-incident-diversion', 'incident', 'Unauthorized settlement diversion', '{"title":"Unauthorized settlement diversion","incidentType":"Fraud","date":"2026-03-24","location":"Oslo","description":"A vendor settlement was rerouted from Argent Pulse Labs to a shell account tied to an external contractor.","status":"Under Investigation","severity":"Critical","caseNumber":"NRR-2026-014","notes":"The diversion chain spans vendor onboarding, portal access, shell accounts, and a crypto off-ramp."}', 1774310400000, 1775001600000, 310, 220),
  ('ent-dana-mercer', 'person', 'Dana Mercer', '{"firstName":"Dana","lastName":"Mercer","alias":"D. Mercer","birthDate":"1990-11-07","birthPlace":"Trondheim, Norway","nationality":"Norwegian","gender":"Female","email":"dana.mercer@nordicrisk.no","phone":"+47 913 22 441","occupation":"Lead Investigator","investigativeRole":"Investigator","notes":"External investigator retained after the internal treasury alert fired."}', 1774051200000, 1775001600000, 80, 80),
  ('ent-elias-voss', 'person', 'Elias Voss', '{"firstName":"Elias","lastName":"Voss","alias":"E. Voss, Elias N. Voss","birthDate":"1987-04-12","birthPlace":"Bergen, Norway","nationality":"Norwegian","gender":"Male","email":"elias.voss@northline-ops.com","phone":"+47 412 44 881","occupation":"Vendor Integration Contractor","investigativeRole":"Subject","photo":"src-badge-portrait","notes":"Contractor who handled vendor onboarding and used an unapproved settlement portal during the diversion window."}', 1774137600000, 1775001600000, 520, 70),
  ('ent-noor-halabi', 'person', 'Noor Halabi', '{"firstName":"Noor","lastName":"Halabi","alias":"N. Halabi","birthDate":"1994-02-09","birthPlace":"Oslo, Norway","nationality":"Norwegian","gender":"Female","email":"noor.halabi@argentpulse.com","phone":"+47 977 88 103","occupation":"Treasury Operations Manager","investigativeRole":"Witness","notes":"Raised the first internal concern after the payout confirmation did not match the expected account."}', 1774224000000, 1775001600000, 80, 360),
  ('ent-priya-sethi', 'person', 'Priya Sethi', '{"firstName":"Priya","lastName":"Sethi","alias":"P. Sethi","birthDate":"1985-09-17","birthPlace":"London, United Kingdom","nationality":"British","gender":"Female","email":"priya.sethi@meridiantrust.eu","phone":"+44 7710 200944","occupation":"Compliance Liaison","investigativeRole":"Associate","notes":"Meridian Trust contact who issued the manual review and freeze notice after the payout reached the shell account."}', 1774224000000, 1775001600000, 330, 70),
  ('ent-argent-pulse', 'organization', 'Argent Pulse Labs', '{"name":"Argent Pulse Labs","legalName":"Argent Pulse Labs AS","organizationType":"Corporation","sector":"Technology","industry":"Payments Analytics","jurisdiction":"Norway","registrationNumber":"NO-924-731-118","website":"https://argentpulse.no","email":"finance@argentpulse.no","phone":"+47 22 41 88 10","status":"Active","specialty":"Real-time payout orchestration","notes":"Victim organization whose reserve account was used for the diverted settlement."}', 1774051200000, 1775001600000, 90, 500),
  ('ent-northline-fulfillment', 'organization', 'Northline Fulfillment LLC', '{"name":"Northline Fulfillment LLC","legalName":"Northline Fulfillment LLC","organizationType":"LLC","sector":"Logistics","industry":"Cross-border fulfillment","jurisdiction":"Estonia","registrationNumber":"EE-1471208","website":"https://northline-ops.eu","email":"ops@northline-ops.eu","phone":"+372 600 1144","status":"Active","specialty":"Vendor onboarding and marketplace settlements","notes":"Shell vendor used as the receiving counterparty for the diverted settlement."}', 1774137600000, 1775001600000, 560, 500),
  ('ent-meridian-trust', 'organization', 'Meridian Trust Bank', '{"name":"Meridian Trust Bank","legalName":"Meridian Trust Bank plc","organizationType":"Corporation","sector":"Financial Services","industry":"Commercial Banking","jurisdiction":"Ireland","registrationNumber":"IE-553102","website":"https://meridiantrust.eu","email":"compliance@meridiantrust.eu","phone":"+353 1 555 2100","status":"Active","specialty":"Cross-border settlement banking","notes":"Bank that froze the receiving account after a manual review alert."}', 1774224000000, 1775001600000, 320, 500),
  ('ent-domain-argentpulse-payments', 'domain', 'argentpulse-payments.com', '{"domain":"argentpulse-payments.com","registrar":"Namecheap","registrationDate":"2026-03-18","expirationDate":"2027-03-18","dnsProvider":"Cloudflare","registrantName":"Northline Fulfillment LLC","registrantCountry":"EE","status":"Active","notes":"Lookalike domain registered six days before the payout diversion."}', 1774310400000, 1775001600000, 820, 120),
  ('ent-website-settlement-portal', 'website', 'secure.argentpulse-payments.com/settlement', '{"url":"https://secure.argentpulse-payments.com/settlement","title":"Argent Pulse Settlement Portal","websiteType":"Corporate","language":"English","status":"Online","serverBanner":"nginx/1.24","sslStatus":"Valid","notes":"Credential collection portal themed to resemble the internal settlement workflow."}', 1774310400000, 1775001600000, 1040, 120),
  ('ent-account-e-voss-ops', 'online_account', '@e_voss_ops', '{"platform":"Telegram","handle":"@e_voss_ops","displayName":"Elias Ops","profileUrl":"https://t.me/e_voss_ops","accountType":"Anonymous","createdDate":"2026-03-16","lastSeen":"2026-03-27","status":"Active","notes":"Account used to coordinate vendor instructions and portal screenshots."}', 1774396800000, 1775001600000, 800, 300),
  ('ent-email-settlements', 'email', 'settlements@argentpulse-payments.com', '{"address":"settlements@argentpulse-payments.com","provider":"Private Mail Relay","accountType":"Business","createdDate":"2026-03-18","lastActive":"2026-03-25","status":"Active","notes":"Mailbox tied to the lookalike domain and used in the onboarding chain."}', 1774396800000, 1775001600000, 1020, 300),
  ('ent-phone-burner', 'phone', '+47 412 44 881', '{"number":"+47 412 44 881","phoneType":"Mobile","carrier":"Ice Norge","countryCode":"+47","registeredDate":"2026-03-19","lastActive":"2026-03-27","status":"Active","notes":"Burner line that appears in portal recovery prompts and vendor coordination messages."}', 1774396800000, 1775001600000, 790, 470),
  ('ent-device-pixel', 'device', 'Pixel 8 Pro Burner', '{"name":"Pixel 8 Pro Burner","deviceType":"Smartphone","manufacturer":"Google","model":"Pixel 8 Pro","serialNumber":"GP8P-44-881-A","imei":"352099118812340","ipAddress":"185.220.101.44","os":"Android 16","status":"Active","purchaseDate":"2026-03-17","notes":"Device recovered from kiosk export metadata and linked to Telegram access."}', 1774483200000, 1775001600000, 1030, 470),
  ('ent-ip-18522010144', 'ip_address', '185.220.101.44', '{"ipAddress":"185.220.101.44","ipVersion":"IPv4","asn":"AS206264","provider":"M247 Europe","reverseDns":"host-44.ams.edge.m247.com","country":"Netherlands","city":"Amsterdam","status":"Observed","notes":"Observed on the portal admin session and in the burner device artifact export."}', 1774483200000, 1775001600000, 1250, 470),
  ('ent-infra-ams-vps-04', 'infrastructure', 'ams-vps-04', '{"hostname":"ams-vps-04","infrastructureType":"Cloud Instance","provider":"M247","os":"Ubuntu 24.04","services":"nginx, docker, tailscale","ipAddress":"185.220.101.44","region":"AMS-1","status":"Online","lastSeen":"2026-03-27","notes":"Hosting asset serving the settlement portal and outbound admin traffic."}', 1774483200000, 1775001600000, 1480, 470),
  ('ent-wallet-bc84', 'crypto_wallet', '0xBC84...A91F', '{"address":"0xBC84F1944B6B1D7264A4F2A52B909B99E77AA91F","assetType":"Ethereum","balance":"14.82 ETH","walletProvider":"MetaMask","status":"Watchlisted","notes":"Wallet funded shortly after the diverted settlement cleared the shell account."}', 1774569600000, 1775001600000, 1010, 660),
  ('ent-account-northline-settlement', 'financial_account', 'Northline settlement account', '{"accountType":"Bank Account","accountNumber":"IE38-MTBE-9099-2211-4400","institutionName":"Meridian Trust Bank","routingNumber":"MTB-443900","currency":"EUR","balance":"EUR 48,110","status":"Frozen","openedDate":"2026-03-20","notes":"Receiving account embedded in the forged onboarding invoice."}', 1774569600000, 1775001600000, 560, 690),
  ('ent-account-argent-reserve', 'financial_account', 'Argent reserve account', '{"accountType":"Bank Account","accountNumber":"NO56-7788-9900-1100","institutionName":"Meridian Trust Bank","routingNumber":"MTB-110011","currency":"EUR","balance":"EUR 1,280,440","status":"Active","openedDate":"2024-06-01","notes":"Reserve payout account used for third-party settlement operations."}', 1774569600000, 1775001600000, 290, 690),
  ('ent-tx-cl8831', 'financial_transaction', 'CL-8831 settlement', '{"transactionReference":"CL-8831","transactionType":"Transfer","transactionDate":"2026-03-24","amount":"EUR 48,200","currency":"EUR","merchant":"Northline Fulfillment LLC","description":"Vendor onboarding settlement batch CL-8831","status":"Completed","notes":"Transaction cleared before the manual review hold was entered."}', 1774656000000, 1775001600000, 425, 850),
  ('ent-doc-invoice-cl8831', 'document', 'Invoice CL-8831', '{"title":"Invoice CL-8831","documentType":"Invoice","author":"Northline Fulfillment LLC","recipient":"Argent Pulse Labs","createdDate":"2026-03-23","modifiedDate":"2026-03-23","filePath":"media/documents/invoice-cl8831.txt","confidentiality":"Internal","notes":"Invoice includes the shell account and portal settlement instructions."}', 1774656000000, 1775001600000, 170, 850),
  ('ent-comm-slack-transfer', 'communication', 'Noor -> Elias', '{"communicationType":"Telegram","from":"Noor Halabi","to":"@e_voss_ops","date":"2026-03-24","subject":"Settlement confirmation","content":"Noor requests vendor confirmation, Elias replies with the portal screenshot and updated remittance path.","direction":"Bidirectional","location":"Oslo","notes":"Thread ties Noor to the forged workflow but not to the diversion intent."}', 1774656000000, 1775001600000, 720, 850),
  ('ent-media-portal-capture', 'media', 'Settlement portal capture', '{"filename":"settlement-portal-capture.svg","mediaType":"Screen Capture","format":"SVG","createdDate":"2026-03-24","resolution":"1600x900","location":"Oslo","metadata":"Synthetic portal screenshot seeded for repo sample.","notes":"Capture shows the Northline account details and the fake Argent Pulse branding."}', 1774656000000, 1775001600000, 1280, 850),
  ('ent-evidence-usb-export', 'evidence', 'USB kiosk export', '{"evidenceType":"Digital","title":"USB kiosk export","description":"Export collected from the self-service kiosk used during the onboarding call.","dateFound":"2026-03-26","locationFound":"Oslo coworking suite","foundBy":"Dana Mercer","chainOfCustody":"Dana Mercer -> NRR Lab -> sealed evidence locker","status":"In Analysis","hash":"sha256:2f7c1aa6e7b84c0b5fb84c6f1920f7a6d0d6f3b6d31b7f8e0f94d4ab18f98320","notes":"Contains portal cookies, device identifiers, and partial chat remnants."}', 1774742400000, 1775001600000, 1510, 850),
  ('ent-location-oslo-suite', 'location', 'Oslo coworking suite', '{"name":"Oslo coworking suite","locationType":"Business","address":"Tordenskiolds gate 7","city":"Oslo","state":"Oslo","zipCode":"0160","country":"Norway","latitude":59.9127,"longitude":10.7393,"accessLevel":"Restricted","notes":"Short-term suite rented by Northline during the onboarding week."}', 1774310400000, 1775001600000, 1320, 210),
  ('ent-event-vendor-call', 'event', 'Vendor onboarding call', '{"title":"Vendor onboarding call","eventType":"Meeting","startDate":"2026-03-24","endDate":"2026-03-24","location":"Oslo coworking suite","outcome":"The payout path was confirmed against the forged portal workflow.","status":"Completed","notes":"The call is the key bridge between the forged invoice and the completed transfer."}', 1774483200000, 1775001600000, 620, 220),
  ('ent-id-badge-voss', 'identity_document', 'Badge NV-20491', '{"documentType":"National ID","documentNumber":"NV-20491","issuingCountry":"NO","issuingAuthority":"Private Access Registry","issueDate":"2026-03-17","expiryDate":"2026-04-17","holderName":"Elias Voss","notes":"Temporary access badge issued for the coworking suite used in the onboarding operation."}', 1774569600000, 1775001600000, 1490, 80);

INSERT INTO edge (id, src_id, dst_id, type, properties_json, created_at, updated_at) VALUES
  ('edge-dana-case', 'ent-dana-mercer', 'ent-case-circuit-ledger', 'case_or_incident_role', '{"subtype":"investigator_on","date":"2026-03-21","notes":"Lead external investigator assigned after the treasury alert."}', 1774051200000, 1775001600000),
  ('edge-dana-incident', 'ent-dana-mercer', 'ent-incident-diversion', 'case_or_incident_role', '{"subtype":"investigator_on","date":"2026-03-24"}', 1774310400000, 1775001600000),
  ('edge-priya-reported', 'ent-priya-sethi', 'ent-incident-diversion', 'case_or_incident_role', '{"subtype":"reported_by","date":"2026-03-24","notes":"Compliance escalation after receiving the bank hold notice."}', 1774656000000, 1775001600000),
  ('edge-elias-suspect', 'ent-elias-voss', 'ent-incident-diversion', 'case_or_incident_role', '{"subtype":"suspect_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-noor-witness', 'ent-noor-halabi', 'ent-incident-diversion', 'case_or_incident_role', '{"subtype":"witness_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-argent-victim', 'ent-argent-pulse', 'ent-incident-diversion', 'case_or_incident_role', '{"subtype":"victim_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-evidence-case', 'ent-evidence-usb-export', 'ent-case-circuit-ledger', 'case_or_incident_role', '{"subtype":"evidence_for","date":"2026-03-26"}', 1774742400000, 1775001600000),
  ('edge-elias-northline', 'ent-elias-voss', 'ent-northline-fulfillment', 'employment_or_affiliation', '{"subtype":"contractor_for","date":"2026-03-17"}', 1774137600000, 1775001600000),
  ('edge-noor-argent', 'ent-noor-halabi', 'ent-argent-pulse', 'employment_or_affiliation', '{"subtype":"employee_of","date":"2024-09-01"}', 1725148800000, 1775001600000),
  ('edge-priya-meridian', 'ent-priya-sethi', 'ent-meridian-trust', 'employment_or_affiliation', '{"subtype":"affiliate_of","date":"2025-06-03"}', 1748908800000, 1775001600000),
  ('edge-elias-account', 'ent-elias-voss', 'ent-account-e-voss-ops', 'ownership_or_control', '{"subtype":"controls","date":"2026-03-16"}', 1774396800000, 1775001600000),
  ('edge-elias-phone', 'ent-elias-voss', 'ent-phone-burner', 'ownership_or_control', '{"subtype":"registered_to","date":"2026-03-19"}', 1774396800000, 1775001600000),
  ('edge-elias-device', 'ent-elias-voss', 'ent-device-pixel', 'ownership_or_control', '{"subtype":"assigned_to","date":"2026-03-20"}', 1774483200000, 1775001600000),
  ('edge-northline-bank', 'ent-northline-fulfillment', 'ent-account-northline-settlement', 'ownership_or_control', '{"subtype":"owns","date":"2026-03-20"}', 1774569600000, 1775001600000),
  ('edge-argent-bank', 'ent-argent-pulse', 'ent-account-argent-reserve', 'ownership_or_control', '{"subtype":"owns","date":"2024-06-01"}', 1717200000000, 1775001600000),
  ('edge-northline-location', 'ent-northline-fulfillment', 'ent-location-oslo-suite', 'located_at', '{"subtype":"based_at","date":"2026-03-19"}', 1774310400000, 1775001600000),
  ('edge-website-hosted', 'ent-website-settlement-portal', 'ent-infra-ams-vps-04', 'located_at', '{"subtype":"hosted_at","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-domain-site', 'ent-domain-argentpulse-payments', 'ent-website-settlement-portal', 'associated_with', '{"subtype":"linked_to","strength":"strong"}', 1774310400000, 1775001600000),
  ('edge-account-website', 'ent-account-e-voss-ops', 'ent-website-settlement-portal', 'used_or_accessed', '{"subtype":"logged_into","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-device-website', 'ent-device-pixel', 'ent-website-settlement-portal', 'used_or_accessed', '{"subtype":"accessed","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-device-infra', 'ent-device-pixel', 'ent-infra-ams-vps-04', 'used_or_accessed', '{"subtype":"connected_to","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-online-noor', 'ent-account-e-voss-ops', 'ent-noor-halabi', 'communicated_with', '{"subtype":"messaged","date":"2026-03-24","strength":"medium"}', 1774656000000, 1775001600000),
  ('edge-event-elias', 'ent-elias-voss', 'ent-event-vendor-call', 'participated_in', '{"subtype":"present_at","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-event-noor', 'ent-noor-halabi', 'ent-event-vendor-call', 'participated_in', '{"subtype":"attended","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-event-priya', 'ent-priya-sethi', 'ent-event-vendor-call', 'participated_in', '{"subtype":"organized","date":"2026-03-24"}', 1774483200000, 1775001600000),
  ('edge-argent-defrauded', 'ent-elias-voss', 'ent-argent-pulse', 'threat_or_harm', '{"subtype":"defrauded","date":"2026-03-24","strength":"high"}', 1774656000000, 1775001600000),
  ('edge-argent-tx', 'ent-account-argent-reserve', 'ent-tx-cl8831', 'financially_linked', '{"subtype":"paid","date":"2026-03-24","strength":"high"}', 1774656000000, 1775001600000),
  ('edge-tx-northline', 'ent-tx-cl8831', 'ent-account-northline-settlement', 'financially_linked', '{"subtype":"transferred_to","date":"2026-03-24","strength":"high"}', 1774656000000, 1775001600000),
  ('edge-tx-wallet', 'ent-tx-cl8831', 'ent-wallet-bc84', 'financially_linked', '{"subtype":"funded","date":"2026-03-25","strength":"medium"}', 1774742400000, 1775001600000),
  ('edge-tx-document', 'ent-tx-cl8831', 'ent-doc-invoice-cl8831', 'documented_by', '{"subtype":"recorded_in","date":"2026-03-23"}', 1774656000000, 1775001600000),
  ('edge-incident-document', 'ent-incident-diversion', 'ent-doc-invoice-cl8831', 'documented_by', '{"subtype":"mentioned_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-website-media', 'ent-website-settlement-portal', 'ent-media-portal-capture', 'documented_by', '{"subtype":"captured_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-incident-comm', 'ent-incident-diversion', 'ent-comm-slack-transfer', 'documented_by', '{"subtype":"recorded_in","date":"2026-03-24"}', 1774656000000, 1775001600000),
  ('edge-elias-id', 'ent-elias-voss', 'ent-id-badge-voss', 'documented_by', '{"subtype":"recorded_in","date":"2026-03-17"}', 1774569600000, 1775001600000),
  ('edge-email-domain', 'ent-email-settlements', 'ent-domain-argentpulse-payments', 'associated_with', '{"subtype":"linked_to"}', 1774396800000, 1775001600000),
  ('edge-ip-infra', 'ent-ip-18522010144', 'ent-infra-ams-vps-04', 'associated_with', '{"subtype":"linked_to"}', 1774483200000, 1775001600000);

INSERT INTO source (id, kind, locator, title, added_at, hash, mime, folder_path, file_name, display_name, file_size, modified_at) VALUES
  ('src-badge-portrait', 'file', 'media/portraits/elias-voss-badge.svg', 'Elias badge portrait', 1774569600000, NULL, 'image/svg+xml', 'portraits', 'elias-voss-badge.svg', 'Elias badge portrait', 1632, 1774569600000),
  ('src-portal-capture', 'file', 'media/screenshots/settlement-portal-capture.svg', 'Settlement portal capture', 1774656000000, NULL, 'image/svg+xml', 'screenshots', 'settlement-portal-capture.svg', 'Settlement portal capture', 2480, 1774656000000),
  ('src-invoice-cl8831', 'file', 'media/documents/invoice-cl8831.txt', 'Invoice CL-8831', 1774656000000, NULL, 'text/plain', 'documents', 'invoice-cl8831.txt', 'Invoice CL-8831', 1220, 1774656000000),
  ('src-bank-hold', 'file', 'media/documents/bank-hold-notice.txt', 'Meridian hold notice', 1774742400000, NULL, 'text/plain', 'documents', 'bank-hold-notice.txt', 'Meridian hold notice', 990, 1774742400000),
  ('src-slack-thread', 'file', 'media/comms/slack-transfer-thread.txt', 'Transfer coordination thread', 1774656000000, NULL, 'text/plain', 'comms', 'slack-transfer-thread.txt', 'Transfer coordination thread', 1060, 1774656000000),
  ('src-analyst-briefing', 'note', 'sources/analyst-briefing.txt', 'Analyst briefing', 1775001600000, NULL, 'text/plain', NULL, NULL, NULL, NULL, 1775001600000),
  ('src-whois-summary', 'note', 'sources/whois-summary.txt', 'WHOIS summary', 1774742400000, NULL, 'text/plain', NULL, NULL, NULL, NULL, 1774742400000),
  ('src-transaction-timeline', 'file', 'sources/transaction-timeline.csv', 'Transaction timeline', 1774828800000, NULL, 'text/csv', NULL, NULL, NULL, NULL, 1774828800000);

INSERT INTO assertion (id, subject_kind, subject_id, path, value_json, source_id, confidence, created_at) VALUES
  ('asrt-case-scope', 'entity', 'ent-case-circuit-ledger', 'properties.description', '"Cross-domain fraud case involving a forged settlement portal, shell vendor, and crypto off-ramp."', 'src-analyst-briefing', 'verified', 1775001600000),
  ('asrt-incident-severity', 'entity', 'ent-incident-diversion', 'properties.severity', '"Critical"', 'src-bank-hold', 'verified', 1774742400000),
  ('asrt-elias-alias', 'entity', 'ent-elias-voss', 'properties.alias', '"E. Voss, Elias N. Voss, e_voss_ops"', 'src-badge-portrait', 'verified', 1774569600000),
  ('asrt-noor-note', 'entity', 'ent-noor-halabi', 'properties.notes', '"Escalated the payout anomaly within nineteen minutes of receiving the altered invoice."', 'src-slack-thread', 'verified', 1774656000000),
  ('asrt-priya-role', 'entity', 'ent-priya-sethi', 'properties.occupation', '"Compliance Liaison"', 'src-bank-hold', 'verified', 1774742400000),
  ('asrt-domain-registrant', 'entity', 'ent-domain-argentpulse-payments', 'properties.registrantName', '"Northline Fulfillment LLC"', 'src-whois-summary', 'verified', 1774742400000),
  ('asrt-portal-status', 'entity', 'ent-website-settlement-portal', 'properties.status', '"Online"', 'src-portal-capture', 'verified', 1774656000000),
  ('asrt-account-last-seen', 'entity', 'ent-account-e-voss-ops', 'properties.lastSeen', '"2026-03-27"', 'src-slack-thread', 'asserted', 1774656000000),
  ('asrt-email-provider', 'entity', 'ent-email-settlements', 'properties.provider', '"Private Mail Relay"', 'src-whois-summary', 'verified', 1774742400000),
  ('asrt-phone-carrier', 'entity', 'ent-phone-burner', 'properties.carrier', '"Ice Norge"', 'src-analyst-briefing', 'asserted', 1775001600000),
  ('asrt-device-imei', 'entity', 'ent-device-pixel', 'properties.imei', '"352099118812340"', 'src-analyst-briefing', 'verified', 1775001600000),
  ('asrt-ip-provider', 'entity', 'ent-ip-18522010144', 'properties.provider', '"M247 Europe"', 'src-whois-summary', 'verified', 1774742400000),
  ('asrt-wallet-status', 'entity', 'ent-wallet-bc84', 'properties.status', '"Watchlisted"', 'src-bank-hold', 'asserted', 1774742400000),
  ('asrt-northline-account', 'entity', 'ent-account-northline-settlement', 'properties.accountNumber', '"IE38-MTBE-9099-2211-4400"', 'src-invoice-cl8831', 'verified', 1774656000000),
  ('asrt-tx-amount', 'entity', 'ent-tx-cl8831', 'properties.amount', '"EUR 48,200"', 'src-invoice-cl8831', 'verified', 1774656000000),
  ('asrt-doc-path', 'entity', 'ent-doc-invoice-cl8831', 'properties.filePath', '"media/documents/invoice-cl8831.txt"', 'src-invoice-cl8831', 'verified', 1774656000000),
  ('asrt-comm-summary', 'entity', 'ent-comm-slack-transfer', 'properties.content', '"Elias shared the portal capture and instructed Noor to use the updated remittance path."', 'src-slack-thread', 'verified', 1774656000000),
  ('asrt-media-location', 'entity', 'ent-media-portal-capture', 'properties.location', '"Oslo coworking suite"', 'src-portal-capture', 'asserted', 1774656000000),
  ('asrt-evidence-hash', 'entity', 'ent-evidence-usb-export', 'properties.hash', '"sha256:2f7c1aa6e7b84c0b5fb84c6f1920f7a6d0d6f3b6d31b7f8e0f94d4ab18f98320"', 'src-analyst-briefing', 'verified', 1775001600000),
  ('asrt-location-access', 'entity', 'ent-location-oslo-suite', 'properties.accessLevel', '"Restricted"', 'src-analyst-briefing', 'verified', 1775001600000),
  ('asrt-event-outcome', 'entity', 'ent-event-vendor-call', 'properties.outcome', '"The payout path was confirmed against the forged portal workflow."', 'src-slack-thread', 'asserted', 1774656000000),
  ('asrt-id-holder', 'entity', 'ent-id-badge-voss', 'properties.holderName', '"Elias Voss"', 'src-badge-portrait', 'verified', 1774569600000);

INSERT INTO transform_run (id, transform_id, input_json, output_summary, consent_snapshot_json, started_at, finished_at) VALUES
  ('trn-whois-portal', 'remote/whois/domain', '{"domain":"argentpulse-payments.com"}', 'WHOIS query tied the lookalike domain to Northline Fulfillment LLC.', '{"actor":"Dana Mercer","granted":true,"destination":"whois"}', 1774742400000, 1774742460000),
  ('trn-local-media-audit', 'local/media/hash', '{"sourceId":"src-portal-capture"}', 'Portal capture preserved as shipped SVG and linked to the website node.', '{"actor":"Dana Mercer","granted":true,"destination":"local"}', 1775001600000, 1775001630000);

INSERT INTO audit (id, action, subject_kind, subject_id, actor, reason, transform_run_id, created_at) VALUES
  ('audit-create-case', 'create', 'entity', 'ent-case-circuit-ledger', 'Dana Mercer', 'Initial showcase case load', NULL, 1774051200000),
  ('audit-attach-invoice', 'attach-source', 'entity', 'ent-doc-invoice-cl8831', 'Dana Mercer', 'Seeded forged invoice evidence', NULL, 1774656000000),
  ('audit-portal-capture', 'attach-source', 'entity', 'ent-media-portal-capture', 'Dana Mercer', 'Seeded portal screenshot for UI preview coverage', 'trn-local-media-audit', 1775001600000),
  ('audit-whois-domain', 'transform', 'entity', 'ent-domain-argentpulse-payments', 'Dana Mercer', 'Confirmed registrant via WHOIS', 'trn-whois-portal', 1774742460000);

INSERT INTO project_setting (key, value_json, updated_at) VALUES
  ('viewport', '{"pan":{"x":-140,"y":-10},"zoom":0.78}', 1775001600000),
  ('default_relationship_confidence', '"verified"', 1775001600000),
  ('show_node_labels', 'true', 1775001600000),
  ('show_node_images', 'true', 1775001600000),
  ('auto_layout_preset', '"off"', 1775001600000),
  ('project:metadata', '{"author":"Dana Mercer","agency":"Nordic Risk Response","caseId":"NRR-2026-014","description":"Settlement diversion through a lookalike vendor portal, shell account, and crypto off-ramp.","jurisdiction":"Norway","tags":["fraud","vendor-risk","cyber","finance"],"notes":"Synthetic repository showcase case."}', 1775001600000),
  ('saved_views', '[{"id":"view-fraud-chain","name":"Fraud Chain","createdAt":1775001600000,"updatedAt":1775001600000,"view":"graph","sidebarTab":"nodes","activeTypeIds":["case","incident","person","organization","financial_account","financial_transaction","document","communication","evidence","crypto_wallet"],"hasSourcesOnly":false,"selectedNodeIds":["ent-incident-diversion","ent-elias-voss","ent-argent-pulse","ent-northline-fulfillment","ent-account-argent-reserve","ent-account-northline-settlement","ent-tx-cl8831","ent-wallet-bc84"],"selectedEdgeIds":["edge-elias-suspect","edge-argent-victim","edge-argent-defrauded","edge-argent-tx","edge-tx-northline","edge-tx-wallet"],"viewport":{"zoom":1.02,"pan":{"x":-210,"y":-120}}},{"id":"view-digital-access","name":"Digital Access Trail","createdAt":1775001600000,"updatedAt":1775001600000,"view":"graph","sidebarTab":"nodes","activeTypeIds":["person","domain","website","online_account","email","phone","device","ip_address","infrastructure","media","location","identity_document"],"hasSourcesOnly":false,"selectedNodeIds":["ent-elias-voss","ent-domain-argentpulse-payments","ent-website-settlement-portal","ent-account-e-voss-ops","ent-email-settlements","ent-phone-burner","ent-device-pixel","ent-ip-18522010144","ent-infra-ams-vps-04","ent-media-portal-capture"],"selectedEdgeIds":["edge-elias-account","edge-elias-phone","edge-elias-device","edge-domain-site","edge-account-website","edge-device-website","edge-device-infra","edge-website-hosted","edge-website-media","edge-ip-infra"],"viewport":{"zoom":0.95,"pan":{"x":-760,"y":-70}}}]', 1775001600000);

COMMIT;
