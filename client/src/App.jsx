
import { useCallback, useEffect, useState } from "react";
import {
  getPricing,
  uploadPricing,
  updatePricing,
} from "./services/pricingService";
import "./App.css";

const PAGE_SIZE = 20;

function getRecords(result) {
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.records)) return result.records;
  if (Array.isArray(result.data?.records)) return result.data.records;
  return [];
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    storeId: "",
    sku: "",
    productName: "",
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    storeId: "",
    sku: "",
    productName: "",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getPricing({
        ...appliedFilters,
        page,
        limit: PAGE_SIZE,
      });

      setRecords(getRecords(result));

      const pagination =
        result.pagination || result.data?.pagination || {};

      setTotalPages(
        Number(pagination.totalPages) > 0
          ? Number(pagination.totalPages)
          : 1
      );
    } catch (err) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  function changeFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setPage(1);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const result = await uploadPricing(file);
      setMessage(result.message || "CSV uploaded successfully.");
      setFile(null);
      event.target.reset();
      setPage(1);
      await loadPricing();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const changes = {
        productName: editing.productName.trim(),
        price: Number(editing.price),
      };

      if (!changes.productName || !Number.isFinite(changes.price) ||
          changes.price < 0) {
        throw new Error("Enter a valid product name and non-negative price.");
      }

      const result = await updatePricing(editing._id, changes);
      setMessage(result.message || "Pricing record updated.");
      setEditing(null);
      await loadPricing();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">R</span>
          <span>Retail<span className="brand-light">Pricing</span></span>
        </a>
        <span className="environment-label">ADMIN CONSOLE</span>
      </header>

      <section className="page-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PRICING OPERATIONS</p>
            <h1>Pricing management</h1>
            <p className="subtitle">
              Manage store pricing, import CSV data, and update product prices.
            </p>
          </div>
          <div className="record-count">
            <span className="count-dot" />
            {records.length} records on this page
          </div>
        </div>

        {message && (
          <div className="notice success" role="status">
            {message}
            <button onClick={() => setMessage("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="notice error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <section className="panel upload-panel">
          <div className="section-heading">
            <div>
              <h2>Import pricing data</h2>
              <p>Upload a CSV file to add or update pricing records.</p>
            </div>
            <span className="section-icon">↑</span>
          </div>

          <form className="upload-form" onSubmit={handleUpload}>
            <label className="file-input">
              <span className="file-symbol">CSV</span>
              <span className="file-description">
                <strong>{file ? file.name : "Choose a CSV file"}</strong>
                <small>
                  {file
                    ? "Ready to upload"
                    : "Select a .csv file from your computer"}
                </small>
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) =>
                  setFile(event.target.files?.[0] || null)
                }
              />
              <span className="browse-button">Browse files</span>
            </label>

            <button className="primary-button" disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload CSV"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Pricing records</h2>
              <p>Search and filter prices across retail stores.</p>
            </div>
          </div>

          <form className="filter-grid" onSubmit={applyFilters}>
            <label>
              Product name
              <input
                name="productName"
                value={filters.productName}
                onChange={changeFilter}
                placeholder="Search products..."
              />
            </label>
            <label>
              Store ID
              <input
                name="storeId"
                value={filters.storeId}
                onChange={changeFilter}
                placeholder="e.g. STORE001"
              />
            </label>
            <label>
              SKU
              <input
                name="sku"
                value={filters.sku}
                onChange={changeFilter}
                placeholder="e.g. SKU1001"
              />
            </label>
            <label>
              From date
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={changeFilter}
              />
            </label>
            <label>
              To date
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={changeFilter}
              />
            </label>
            <div className="filter-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setFilters({
                    storeId: "",
                    sku: "",
                    productName: "",
                    dateFrom: "",
                    dateTo: "",
                  });
                  setAppliedFilters({
                    storeId: "",
                    sku: "",
                    productName: "",
                    dateFrom: "",
                    dateTo: "",
                  });
                  setPage(1);
                }}
              >
                Clear
              </button>
              <button type="submit" className="primary-button">
                Search
              </button>
            </div>
          </form>

          <div className="table-meta">
            <span>Product pricing</span>
            <button className="text-button" onClick={loadPricing}>
              ↻ Refresh
            </button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>SKU</th>
                  <th>STORE</th>
                  <th>PRICE</th>
                  <th>EFFECTIVE DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      Loading pricing records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No pricing records found. Try another filter or upload a CSV.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong className="product-name">
                          {record.productName}
                        </strong>
                      </td>
                      <td><span className="sku">{record.sku}</span></td>
                      <td>{record.storeId}</td>
                      <td className="price">
                        {Number(record.price).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        {record.date
                          ? new Date(record.date).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <button
                          className="edit-button"
                          onClick={() =>
                            setEditing({
                              _id: record._id,
                              productName: record.productName,
                              price: String(record.price),
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button
                className="secondary-button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <button
                className="secondary-button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </section>

      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <form className="edit-modal" onSubmit={handleSave}>
            <div className="section-heading">
              <div>
                <h2>Edit pricing</h2>
                <p>Update the product name or price.</p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>

            <label>
              Product name
              <input
                value={editing.productName}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    productName: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Price (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                value={editing.price}
                onChange={(event) =>
                  setEditing((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="footer">
        Retail Pricing Management <span>•</span> React + Express + MongoDB
      </footer>
    </main>
  );
}
