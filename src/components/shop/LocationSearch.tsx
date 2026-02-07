// src/components/shop/LocationSearch.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import '../../css/component/shop/LocationSearch.css';

interface LocationSearchProps {
  onSearch: (shops: any[]) => void;
}

export default function LocationSearch({ onSearch }: LocationSearchProps) {
  const [states, setStates] = useState<{ key: string; value: string }[]>([]);
  const [lgas, setLgas] = useState<{ key: string; value: string }[]>([]);
  const [towns, setTowns] = useState<{ key: string; value: string }[]>([]);

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedLga, setSelectedLga] = useState<string | null>(null);
  const [selectedTown, setSelectedTown] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/states/');
        const sorted = res.data.locations
          .map((loc: any) => ({ key: loc.id, value: loc.name }))
          .sort((a: any, b: any) => a.value.localeCompare(b.value));
        setStates(sorted);
      } catch (err) {
        setError('Failed to load states');
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    const fetchChildren = async () => {
      try {
        const formData = new FormData();
        formData.append('parent_id', selectedState);
        const res = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/', formData);
        const sorted = res.data.locations
          .map((loc: any) => ({ key: loc.id, value: loc.name }))
          .sort((a: any, b: any) => a.value.localeCompare(b.value));
        setLgas(sorted);
      } catch {
        setError('Failed to load LGAs');
      }
    };
    fetchChildren();
  }, [selectedState]);

  useEffect(() => {
    if (!selectedLga) return;
    const fetchChildren = async () => {
      try {
        const formData = new FormData();
        formData.append('parent_id', selectedLga);
        const res = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/', formData);
        const sorted = res.data.locations
          .map((loc: any) => ({ key: loc.id, value: loc.name }))
          .sort((a: any, b: any) => a.value.localeCompare(b.value));
        setTowns(sorted);
      } catch {
        setError('Failed to load towns');
      }
    };
    fetchChildren();
  }, [selectedLga]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    const locationId = selectedTown || selectedLga || selectedState;
    if (!locationId) {
      setError('Please select a location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/search/', {
        params: { input: searchTerm.trim(), location_id: locationId },
      });

      const shops = res.data.shops || res.data || [];
      if (shops.length === 0) {
        setError('No shops found in this area');
        return;
      }

      const limited = shops.slice(0, 50);
      onSearch(limited);
      navigate('/shop/SearchResult', {
        state: { searchTerm: searchTerm.trim(), shops: limited },
      });
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedState, selectedLga, selectedTown, onSearch, navigate]);

  return (
    <motion.div
      className="location-search"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="select-group">
        <label>Select State</label>
        <select
          value={selectedState || ''}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setSelectedLga(null);
            setSelectedTown(null);
          }}
          disabled={loading}
        >
          <option value="">Choose state</option>
          {states.map((s) => (
            <option key={s.key} value={s.key}>
              {s.value}
            </option>
          ))}
        </select>

        {selectedState && (
          <>
            <label>Select LGA</label>
            <select
              value={selectedLga || ''}
              onChange={(e) => {
                setSelectedLga(e.target.value);
                setSelectedTown(null);
              }}
              disabled={loading}
            >
              <option value="">Choose LGA</option>
              {lgas.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.value}
                </option>
              ))}
            </select>
          </>
        )}

        {selectedLga && (
          <>
            <label>Select Town / Area</label>
            <select
              value={selectedTown || ''}
              onChange={(e) => setSelectedTown(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose town/area (optional)</option>
              {towns.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.value}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="input-group">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="What are you looking for? (e.g. supermarket, fashion...)"
          className="search-input"
          disabled={loading}
        />

        <motion.button
          className="search-btn"
          onClick={handleSearch}
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? 'Searching...' : 'Search in Area'}
        </motion.button>
      </div>
    </motion.div>
  );
}