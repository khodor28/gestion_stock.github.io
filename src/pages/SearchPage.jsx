import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db';
import './SearchPage.css';

const SearchPage = () => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (value) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    const lower = value.trim().toLowerCase();
    const produits = await db.produits
      .filter(p => p.reference && p.reference.toLowerCase().includes(lower))
      .toArray();

    if (produits.length === 0) {
      setResults([]);
      setSearched(true);
      return;
    }

    const produitIds = new Set(produits.map(p => p.id));
    const allEmps = await db.emplacements
      .filter(e => e.produitIds?.some(id => produitIds.has(id)))
      .toArray();

    const rows = await Promise.all(
      allEmps.flatMap(emp =>
        (emp.produitIds || [])
          .filter(pid => produitIds.has(pid))
          .map(async pid => {
            const etage  = await db.etages.get(emp.etageId);
            const depot  = etage ? await db.depots.get(etage.depotId) : null;
            const produit = produits.find(p => p.id === pid);
            return {
              reference: produit?.reference || '',
              depot:     depot?.name  || '?',
              depotId:   depot?.id,
              etage:     etage?.name  || '?',
              etageId:   etage?.id,
              ligne:     emp.ligne,
              colonne:   emp.colonne,
            };
          })
      )
    );

    setResults(rows);
    setSearched(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Recherche</h1>
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="input"
          type="text"
          placeholder="Référence produit..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
          style={{ paddingLeft: '42px' }}
          autoFocus
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
          >×</button>
        )}
      </div>

      {!searched && (
        <div className="search-placeholder card">
          <span className="empty-icon">📦</span>
          <p>Entrez une référence pour trouver ses emplacements dans tous vos dépôts.</p>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="card empty-state">
          <span className="empty-icon">🔎</span>
          <p>Aucun résultat</p>
          <p>Aucun emplacement trouvé pour « {query} ».</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <p className="results-count">
            {results.length} emplacement{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              className="result-card card"
              onClick={() => navigate(
                `/depot/${r.depotId}/etage/${r.etageId}?ligne=${r.ligne}&colonne=${r.colonne}&ref=${encodeURIComponent(r.reference)}`
              )}
            >
              <div className="result-ref">🏷 {r.reference}</div>
              <div className="result-location">
                <span className="result-depot">🏭 {r.depot}</span>
                <span className="result-sep">›</span>
                <span className="result-etage">📦 {r.etage}</span>
                <span className="result-sep">›</span>
                <span className="result-cell">E{r.ligne}-{r.colonne}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;

