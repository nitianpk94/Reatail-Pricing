
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api";

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed: ${response.status}`);
  }

  return result;
}

export async function getPricing(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      params.set(key, value);
    }
  });

  return request(`${API_BASE_URL}/pricing?${params.toString()}`);
}

export async function uploadPricing(file) {
  const formData = new FormData();
  formData.append("file", file);

  return request(`${API_BASE_URL}/pricing/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function updatePricing(id, changes) {
  return request(`${API_BASE_URL}/pricing/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
}
