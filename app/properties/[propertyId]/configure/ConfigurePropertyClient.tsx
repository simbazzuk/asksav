"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export default function ConfigurePropertyClient({
  propertyId,
  initialAssets,
}: {
  propertyId: string;
  initialAssets: any[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formElement = e.currentTarget;

    setLoading(true);
    setError("");

    const form = new FormData(formElement);
    const payload = {
      roomName: String(form.get("roomName") || ""),
      assetName: String(form.get("assetName") || ""),
    };

    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/assets`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not add asset.");
      }

      const reload = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}/assets`
      );

      if (!reload.ok) {
        const reloadResult = await reload.json().catch(() => ({}));
        throw new Error(
          reloadResult.error || "Item added, but the checklist could not be refreshed."
        );
      }

      const refreshedAssets = await reload.json();
      setAssets(refreshedAssets);

      formElement.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add asset.");
    } finally {
      setLoading(false);
    }
  }

  const rooms = useMemo(
    () =>
      Array.from(
        new Set(assets.map((a: any) => String(a.room_name)))
      ),
    [assets]
  );

  return (
    <div className="sf1267-configure-layout">
      <section className="sf1267-structure-card">
        <div className="sf1267-card-heading">
          <div>
            <div className="sf1267-card-eyebrow">INSPECTION CHECKLIST</div>
            <h2>Inspection structure</h2>
            <p>
              These rooms and assets define the checklist used for every
              inspection of this property.
            </p>
          </div>

          <div className="sf1267-item-count">
            <strong>{assets.length}</strong>
            <span>{assets.length === 1 ? "item" : "items"}</span>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="sf1267-empty-state">
            <div className="sf1267-empty-icon" aria-hidden="true">+</div>
            <h3>No inspection areas yet</h3>
            <p>
              Add the rooms and surfaces you want AskSAV to inspect. For
              example Bedroom - Wall, Kitchen - Window or Bathroom - Ceiling.
            </p>
            <span>
              Your first completed inspection will establish the visual
              baseline for each item.
            </span>
          </div>
        ) : (
          <div className="sf1267-room-list">
            {rooms.map((room) => {
              const roomAssets = assets.filter(
                (a: any) => a.room_name === room
              );

              return (
                <div className="sf1267-room-card" key={room}>
                  <div className="sf1267-room-head">
                    <div>
                      <span className="sf1267-room-label">ROOM / AREA</span>
                      <h3>{room}</h3>
                    </div>
                    <span className="sf1267-room-count">
                      {roomAssets.length}{" "}
                      {roomAssets.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="sf1267-assets">
                    {roomAssets.map((asset: any) => (
                      <div
                        className="sf1267-asset"
                        key={asset.asset_id}
                      >
                        <span
                          className="sf1267-asset-check"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span>{asset.asset_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <aside className="sf1267-add-card">
        <div className="sf1267-card-eyebrow">BUILD YOUR CHECKLIST</div>
        <h2>Add inspection item</h2>
        <p className="sf1267-add-intro">
          Add one room and surface at a time. You can add more items whenever
          the property setup changes.
        </p>

        <form onSubmit={add}>
          <div className="sf1267-field">
            <label htmlFor="roomName">Room / area</label>
            <input
              id="roomName"
              name="roomName"
              required
              placeholder="e.g. Bedroom"
            />
            <small>Examples: Bedroom, Kitchen, Hallway or Bathroom.</small>
          </div>

          <div className="sf1267-field">
            <label htmlFor="assetName">Asset / surface</label>
            <input
              id="assetName"
              name="assetName"
              required
              placeholder="e.g. Wall"
            />
            <small>Examples: Wall, Ceiling, Window, Radiator or Socket.</small>
          </div>

          <button
            className="sf1267-add-button"
            type="submit"
            disabled={loading}
          >
            <span aria-hidden="true">+</span>
            {loading ? "Adding..." : "Add inspection item"}
          </button>
        </form>

        {error && <div className="error sf1267-error">{error}</div>}

        <div className="sf1267-next">
          <div className="sf1267-next-copy">
            <strong>Ready for the first inspection?</strong>
            <span>
              {assets.length > 0
                ? `${assets.length} inspection ${
                    assets.length === 1 ? "item is" : "items are"
                  } configured.`
                : "Add at least one inspection item before you continue."}
            </span>
          </div>

          {assets.length > 0 ? (
            <Link
              className="sf1267-start-button"
              href={`/inspection-session?property=${encodeURIComponent(
                propertyId
              )}`}
            >
              Start inspection
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button
              className="sf1267-start-button disabled"
              type="button"
              disabled
            >
              Start inspection
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
