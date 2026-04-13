"use client";
import React, { useEffect, useState, FormEvent } from "react";
import {
  searchPublicUnits,
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
} from "@/lib/api/saved-searches";
import type { Unit, SavedSearch, PublicUnitSearchParams } from "@/types/api";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Alert from "@/components/ui/alert/Alert";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

export default function SavedSearchesPage() {
  const [tab, setTab] = useState<"search" | "saved">("search");

  const [units, setUnits] = useState<Unit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [lastFilters, setLastFilters] = useState<PublicUnitSearchParams>({});

  useEffect(() => {
    listSavedSearches()
      .then(setSaved)
      .catch(() => setSavedError("Failed to load saved searches."))
      .finally(() => setSavedLoading(false));
  }, []);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError(null);
    const fd = new FormData(e.currentTarget);
    const params: PublicUnitSearchParams = {};
    const val = (key: string) => (fd.get(key) as string)?.trim();
    if (val("price_min")) params.price_min = Number(val("price_min"));
    if (val("price_max")) params.price_max = Number(val("price_max"));
    if (val("bedrooms")) params.bedrooms = Number(val("bedrooms"));
    if (val("bathrooms")) params.bathrooms = Number(val("bathrooms"));
    if (val("property_type")) params.property_type = val("property_type");
    if (val("amenities")) params.amenities = val("amenities");
    if (fd.get("parking") === "on") params.parking = true;
    if (val("lat")) params.lat = Number(val("lat"));
    if (val("lng")) params.lng = Number(val("lng"));
    if (val("radius_km")) params.radius_km = Number(val("radius_km"));
    setLastFilters(params);
    try {
      const results = await searchPublicUnits(params);
      setUnits(results);
    } catch {
      setSearchError("Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSaveSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createSavedSearch({
        name: fd.get("name") as string,
        filters: lastFilters,
        notify_on_match: fd.get("notify") === "on",
      });
      setShowSaveForm(false);
      const updated = await listSavedSearches();
      setSaved(updated);
      setSuccess("Search saved.");
    } catch {
      setSavedError("Failed to save search.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSaved(id: number) {
    if (!confirm("Delete this saved search?")) return;
    try {
      await deleteSavedSearch(id);
      setSaved((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSavedError("Failed to delete.");
    }
  }

  async function runSavedSearch(s: SavedSearch) {
    setTab("search");
    setSearchLoading(true);
    setLastFilters(s.filters);
    try {
      const results = await searchPublicUnits(s.filters);
      setUnits(results);
    } catch {
      setSearchError("Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Unit Search & Saved Searches</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "search" ? "primary" : "outline"} onClick={() => setTab("search")}>Search</Button>
          <Button size="sm" variant={tab === "saved" ? "primary" : "outline"} onClick={() => setTab("saved")}>Saved ({saved.length})</Button>
        </div>
      </div>

      {success && <div className="mb-4"><Alert variant="success" title="" message={success} /></div>}

      {tab === "search" && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Filter Public Units</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><Label>Min Price</Label><Input name="price_min" type="number" placeholder="10000" /></div>
              <div><Label>Max Price</Label><Input name="price_max" type="number" placeholder="50000" /></div>
              <div><Label>Min Bedrooms</Label><Input name="bedrooms" type="number" placeholder="2" /></div>
              <div><Label>Min Bathrooms</Label><Input name="bathrooms" type="number" placeholder="1" /></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <Label>Property Type</Label>
                <select name="property_type" className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90">
                  <option value="">Any</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="studio">Studio</option>
                  <option value="commercial">Commercial</option>
                  <option value="bungalow">Bungalow</option>
                  <option value="duplex">Duplex</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="cottage">Cottage</option>
                  <option value="penthouse">Penthouse</option>
                </select>
              </div>
              <div><Label>Amenities</Label><Input name="amenities" placeholder="WiFi, gym" /></div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" name="parking" />
                  Parking Required
                </label>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div><Label>Latitude</Label><Input name="lat" placeholder="-1.2921" /></div>
              <div><Label>Longitude</Label><Input name="lng" placeholder="36.8172" /></div>
              <div><Label>Radius (km)</Label><Input name="radius_km" placeholder="5" /></div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button size="sm" disabled={searchLoading}>{searchLoading ? "Searching…" : "Search"}</Button>
              {Object.keys(lastFilters).length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowSaveForm(!showSaveForm)}>
                  {showSaveForm ? "Cancel Save" : "Save This Search"}
                </Button>
              )}
            </div>
          </form>

          {showSaveForm && (
            <form onSubmit={handleSaveSearch} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-3 font-semibold text-gray-800 dark:text-white/90">Save Search</h3>
              <div className="flex flex-wrap items-end gap-4">
                <div><Label>Name</Label><Input name="name" placeholder="2-bed in Westlands under 50k" /></div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" name="notify" defaultChecked />
                  Notify on match
                </label>
                <Button size="sm" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          )}

          {searchError && <Alert variant="error" title="Error" message={searchError} />}

          {units.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 font-semibold text-gray-800 dark:text-white/90">Results ({units.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {units.map((u) => (
                  <div key={u.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-white/90">{u.name}</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">KES {u.price}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{u.bedrooms} bed · {u.bathrooms} bath</p>
                    {u.amenities && <p className="mt-1 text-xs text-gray-400">{u.amenities}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      {u.parking_space && <Badge variant="light" size="sm" color="success">Parking</Badge>}
                      {u.tour_url && (
                        <a href={u.tour_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:text-brand-600">Virtual Tour</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searchLoading && units.length === 0 && Object.keys(lastFilters).length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-gray-400">No units match your filters.</p>
            </div>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div>
          {savedError && <div className="mb-4"><Alert variant="error" title="Error" message={savedError} /></div>}
          {savedLoading ? (
            <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
          ) : saved.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-gray-400">No saved searches. Search for units and save your criteria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {saved.map((s) => (
                <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white/90">{s.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(s.filters).map(([k, v]) =>
                          v !== undefined ? (
                            <Badge key={k} variant="light" size="sm" color="primary">{k}: {String(v)}</Badge>
                          ) : null,
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        {s.notify_on_match && <Badge variant="light" size="sm" color="success">Notifications on</Badge>}
                        <span>Created {new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => runSavedSearch(s)}>Run</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteSaved(s.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
