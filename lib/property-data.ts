import { randomUUID } from "crypto";
import { bigquery, dataset, location, projectId } from "./google";

export async function listProperties() {
  const query = `
    SELECT
      p.property_id,
      p.property_name,
      p.address_line1,
      p.address_line2,
      p.city,
      p.postcode,
      p.property_type,
      p.status,
      COUNT(DISTINCT a.asset_id) AS configured_assets,
      MAX(i.created_at) AS last_inspection
    FROM \`${projectId}.${dataset}.properties\` p
    LEFT JOIN \`${projectId}.${dataset}.property_assets\` a
      ON p.property_id = a.property_id
     AND a.is_active = TRUE
    LEFT JOIN \`${projectId}.${dataset}.inspections\` i
      ON p.property_id = i.property_id
    GROUP BY
      p.property_id, p.property_name, p.address_line1, p.address_line2,
      p.city, p.postcode, p.property_type, p.status
    ORDER BY p.property_name, p.address_line1
  `;

  const [rows] = await bigquery.query({ query, location });
  return rows;
}

export async function getPropertyRecord(propertyId: string) {
  const query = `
    SELECT *
    FROM \`${projectId}.${dataset}.properties\`
    WHERE property_id = @property_id
    LIMIT 1
  `;

  const [rows] = await bigquery.query({
    query,
    location,
    params: { property_id: propertyId },
  });

  return rows[0] || null;
}

export async function getPropertyAssets(propertyId: string) {
  const query = `
    SELECT
      property_id,
      room_id,
      room_name,
      asset_id,
      asset_name,
      display_order
    FROM \`${projectId}.${dataset}.property_assets\`
    WHERE property_id = @property_id
      AND is_active = TRUE
    ORDER BY display_order, room_name, asset_name
  `;

  const [rows] = await bigquery.query({
    query,
    location,
    params: { property_id: propertyId },
  });

  return rows;
}

export async function createProperty(input: {
  propertyName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  propertyType: string;
}) {
  const propertyId = `PROP-${randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  await bigquery.dataset(dataset).table("properties").insert([{
    property_id: propertyId,
    property_name: input.propertyName,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 || "",
    city: input.city,
    postcode: input.postcode,
    property_type: input.propertyType,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  }]);

  return propertyId;
}

export async function addAsset(input: {
  propertyId: string;
  roomName: string;
  assetName: string;
}) {
  const clean = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const roomId = clean(input.roomName);
  const assetId = `${roomId}-${clean(input.assetName)}-${randomUUID().slice(0, 4)}`;
  const now = new Date().toISOString();

  const countQuery = `
    SELECT COUNT(*) AS n
    FROM \`${projectId}.${dataset}.property_assets\`
    WHERE property_id = @property_id
  `;

  const [rows] = await bigquery.query({
    query: countQuery,
    location,
    params: { property_id: input.propertyId },
  });

  const order = Number(rows[0]?.n || 0) * 10 + 10;

  await bigquery.dataset(dataset).table("property_assets").insert([{
    property_id: input.propertyId,
    room_id: roomId,
    room_name: input.roomName,
    asset_id: assetId,
    asset_name: input.assetName,
    display_order: order,
    is_active: true,
    created_at: now,
    updated_at: now,
  }]);

  return assetId;
}
