MERGE `siteface-dev.siteface.properties` T
USING (
  SELECT
    'PROP001' AS property_id,
    'Demo Property' AS property_name,
    '12 Smith Street' AS address_line1,
    '' AS address_line2,
    'Sheffield' AS city,
    'S1 1AA' AS postcode,
    'House' AS property_type,
    'ACTIVE' AS status
) S
ON T.property_id = S.property_id
WHEN NOT MATCHED THEN
  INSERT (
    property_id, property_name, address_line1, address_line2,
    city, postcode, property_type, status, created_at, updated_at
  )
  VALUES (
    S.property_id, S.property_name, S.address_line1, S.address_line2,
    S.city, S.postcode, S.property_type, S.status, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()
  );

DELETE FROM `siteface-dev.siteface.property_assets`
WHERE property_id = 'PROP001';

INSERT INTO `siteface-dev.siteface.property_assets`
(property_id, room_id, room_name, asset_id, asset_name, display_order, is_active, created_at, updated_at)
VALUES
('PROP001','hallway','Hallway','hallway-wall','Wall',10,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','hallway','Hallway','hallway-ceiling','Ceiling',20,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','kitchen','Kitchen','kitchen-wall','Wall',30,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','kitchen','Kitchen','kitchen-ceiling','Ceiling',40,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','kitchen','Kitchen','kitchen-window','Window',50,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','bedroom','Bedroom','bedroom-wall','Wall',60,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','bedroom','Bedroom','bedroom-window','Window',70,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','bathroom','Bathroom','bathroom-wall','Wall',80,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','bathroom','Bathroom','bathroom-ceiling','Ceiling',90,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','utilities','Utilities','radiator','Radiator',100,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP()),
('PROP001','utilities','Utilities','socket-switch','Socket / switch',110,TRUE,CURRENT_TIMESTAMP(),CURRENT_TIMESTAMP());
