"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function NewPropertyClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const payload = {
      propertyName: String(form.get("propertyName") || ""),
      addressLine1: String(form.get("addressLine1") || ""),
      addressLine2: String(form.get("addressLine2") || ""),
      city: String(form.get("city") || ""),
      postcode: String(form.get("postcode") || ""),
      propertyType: String(form.get("propertyType") || "House"),
    };

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not create property.");
      }

      router.push(
        `/properties/${encodeURIComponent(result.propertyId)}/configure`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create property.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="sf1264-property-card" onSubmit={submit}>
      <div className="sf1264-property-intro">
        <div className="sf1264-property-icon" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>

        <div>
          <h2>Property details</h2>
          <p>
            Enter the property information used for inspections, evidence and
            reporting.
          </p>
        </div>
      </div>

      <div className="sf1264-form-grid">
        <div className="sf1264-field">
          <label htmlFor="propertyName">
            Property name <span>*</span>
          </label>
          <input
            id="propertyName"
            name="propertyName"
            required
            placeholder="e.g. Smith Street House"
          />
          <small>A friendly name to identify this property.</small>
        </div>

        <div className="sf1264-field">
          <label htmlFor="propertyType">
            Property type <span>*</span>
          </label>
          <select id="propertyType" name="propertyType" defaultValue="House">
            <option>House</option>
            <option>Flat</option>
            <option>Apartment</option>
            <option>Commercial</option>
            <option>Other</option>
          </select>
          <small>Choose the property category used for inspection context.</small>
        </div>

        <div className="sf1264-field">
          <label htmlFor="addressLine1">
            Address line 1 <span>*</span>
          </label>
          <input
            id="addressLine1"
            name="addressLine1"
            required
            placeholder="e.g. 12 Smith Street"
          />
          <small>Main address line for the property.</small>
        </div>

        <div className="sf1264-field">
          <label htmlFor="addressLine2">Address line 2</label>
          <input
            id="addressLine2"
            name="addressLine2"
            placeholder="e.g. Apartment 2, Block B"
          />
          <small>Optional additional address information.</small>
        </div>

        <div className="sf1264-field">
          <label htmlFor="city">
            City <span>*</span>
          </label>
          <input id="city" name="city" required placeholder="e.g. Sheffield" />
          <small>Town or city where the property is located.</small>
        </div>

        <div className="sf1264-field">
          <label htmlFor="postcode">
            Postcode <span>*</span>
          </label>
          <input id="postcode" name="postcode" required placeholder="e.g. S1 1AA" />
          <small>UK postcode for the property.</small>
        </div>
      </div>

      <div className="sf1264-actions">
        <button
          type="button"
          className="sf1264-cancel"
          onClick={() => router.push("/properties")}
          disabled={loading}
        >
          <span aria-hidden="true">←</span>
          Cancel
        </button>

        <button
          type="submit"
          className="sf1264-create"
          disabled={loading}
        >
          <span className="sf1264-create-icon" aria-hidden="true">
            +
          </span>
          {loading ? "Creating..." : "Create property"}
        </button>
      </div>

      {error && <div className="error sf1264-error">{error}</div>}
    </form>
  );
}
