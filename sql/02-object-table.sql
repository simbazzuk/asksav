-- Replace names as required.
CREATE OR REPLACE EXTERNAL TABLE `siteface-dev.siteface.images`
WITH CONNECTION `siteface-dev.europe-west2.siteface-connection`
OPTIONS (
  object_metadata = 'SIMPLE',
  uris = ['gs://siteface-images-dev/*']
);
