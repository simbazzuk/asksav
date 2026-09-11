CREATE OR REPLACE MODEL `siteface-dev.siteface.gemini_model`
REMOTE WITH CONNECTION `siteface-dev.europe-west2.siteface-connection`
OPTIONS (
  ENDPOINT = 'gemini-3.5-flash'
);
