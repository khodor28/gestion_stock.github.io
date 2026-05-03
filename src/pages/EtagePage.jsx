import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import db from '../db';
import './EtagePage.css';

/* ——— Shared UI ——— */
const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-handle" />
      <h3>{title}</h3>
      {children}
    </div>
  </div>
);

const Toast = ({ message, type }) => (
  <div className={`toast ${type}`}>{message}</div>
);

/* ——— Main component ——— */
const EtagePage = () => {
  const { depotId, etageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const scrollLigne   = Number(params.get('ligne'));
  const scrollColonne = Number(params.get('colonne'));
  const refInUrl      = params.get('ref') || '';

  /* Data */
  const [depot, setDepot]             = useState(null);
  const [etage, setEtage]             = useState(null);
  const [nbLignes, setNbLignes]       = useState(5);
  const [nbColonnes, setNbColonnes]   = useState(5);
  const [emplacements, setEmplacements] = useState([]);
  const [produitsMap, setProduitsMap] = useState(new Map());

  /* UI state */
  const [mode, setMode]             = useState('view'); // view | add | delete | edit
  const [searchRef, setSearchRef]   = useState(refInUrl);
  const [addModal, setAddModal]     = useState(null);  // { ligne, colonne }
  const [addRef, setAddRef]         = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // { emplacement, produitId }
  const [toast, setToast]           = useState(null);

  const scrollTargetRef = useRef(null);

  /* Load data */
  useEffect(() => {
    const fetchData = async () => {
      const dep = await db.depots.get(Number(depotId));
      setDepot(dep);
      const et = await db.etages.get(Number(etageId));
      setEtage(et);
      if (et) {
        setNbLignes(et.nbLignes || 5);
        setNbColonnes(et.nbColonnes || 5);
      }
      const emps = await db.emplacements.where('etageId').equals(Number(etageId)).toArray();
      setEmplacements(emps);
      const produits = await db.produits.toArray();
      setProduitsMap(new Map(produits.map(p => [p.id, p])));
    };
    fetchData();
  }, [depotId, etageId]);

  /* Scroll to highlighted cell */
  useEffect(() => {
    if (!scrollTargetRef.current) return;
    const timer = setTimeout(() => {
      scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 250);
    return () => clearTimeout(timer);
  }, [emplacements, nbLignes, nbColonnes, scrollLigne, scrollColonne]);

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2200);
  };

  const reloadEmplacements = async () => {
    const emps = await db.emplacements.where('etageId').equals(Number(etageId)).toArray();
    setEmplacements(emps);
  };

  /* ——— Grid configuration ——— */
  const updateGridSize = async (l, c) => {
    const lignes   = Math.max(1, Math.min(30, Number(l)));
    const colonnes = Math.max(1, Math.min(30, Number(c)));
    setNbLignes(lignes);
    setNbColonnes(colonnes);
    await db.etages.update(Number(etageId), { nbLignes: lignes, nbColonnes: colonnes });
  };

  /* ——— Remove row / col ——— */
  const removeLigne = async (ligne) => {
    const empsInRow = emplacements.filter(e => e.ligne === ligne);
    const hasProducts = empsInRow.some(e => e.produitIds?.length > 0);
    if (hasProducts) { flash('Retirez d\'abord les produits de cette ligne.', 'error'); return; }
    await Promise.all(empsInRow.map(e => db.emplacements.delete(e.id)));
    const toShift = emplacements.filter(e => e.ligne > ligne);
    await Promise.all(toShift.map(e => db.emplacements.update(e.id, { ligne: e.ligne - 1 })));
    await updateGridSize(nbLignes - 1, nbColonnes);
    await reloadEmplacements();
    flash('Ligne supprimée.');
  };

  const removeColonne = async (col) => {
    const empsInCol = emplacements.filter(e => e.colonne === col);
    const hasProducts = empsInCol.some(e => e.produitIds?.length > 0);
    if (hasProducts) { flash('Retirez d\'abord les produits de cette colonne.', 'error'); return; }
    await Promise.all(empsInCol.map(e => db.emplacements.delete(e.id)));
    const toShift = emplacements.filter(e => e.colonne > col);
    await Promise.all(toShift.map(e => db.emplacements.update(e.id, { colonne: e.colonne - 1 })));
    await updateGridSize(nbLignes, nbColonnes - 1);
    await reloadEmplacements();
    flash('Colonne supprimée.');
  };

  /* ——— Cell click handler ——— */
  const onCellClick = async (ligne, colonne) => {
    if (mode === 'edit') {
      const emp = await db.emplacements.where({ etageId: Number(etageId), ligne, colonne }).first();
      if (emp) {
        await db.emplacements.update(emp.id, { disabled: !emp.disabled });
      } else {
        await db.emplacements.add({ etageId: Number(etageId), ligne, colonne, produitIds: [], disabled: true });
      }
      await reloadEmplacements();
    } else if (mode === 'add') {
      setAddRef('');
      setAddModal({ ligne, colonne });
    }
  };

  /* ——— Add product ——— */
  const handleAddProduit = async () => {
    const reference = addRef.trim();
    if (!reference || !addModal) return;

    let produit = await db.produits.where('reference').equals(reference).first();
    if (!produit) {
      const id = await db.produits.add({ reference });
      produit = await db.produits.get(id);
      setProduitsMap(prev => new Map([...prev, [produit.id, produit]]));
    }

    const { ligne, colonne } = addModal;
    const emp = await db.emplacements.where({ etageId: Number(etageId), ligne, colonne }).first();
    if (emp) {
      const ids = emp.produitIds ? [...emp.produitIds] : [];
      if (!ids.includes(produit.id)) ids.push(produit.id);
      await db.emplacements.update(emp.id, { produitIds: ids, disabled: false });
    } else {
      await db.emplacements.add({ etageId: Number(etageId), ligne, colonne, produitIds: [produit.id], disabled: false });
    }
    setAddModal(null);
    setAddRef('');
    await reloadEmplacements();
    flash('Produit ajouté !');
  };

  /* ——— Delete product ——— */
  const handleDeleteProduit = async () => {
    if (!deleteModal) return;
    const { emplacement, produitId } = deleteModal;
    const ids = emplacement.produitIds.filter(id => id !== produitId);
    await db.emplacements.update(emplacement.id, { produitIds: ids });
    setDeleteModal(null);
    await reloadEmplacements();
    flash('Produit retiré.');
  };

  /* ——— Render grid ——— */
  const renderGrid = () => {
    const lowerSearch = searchRef.toLowerCase();
    return (
      <div className="grid-table">
        {/* Column headers row */}
        <div className="grid-header-row">
          <div className="grid-corner" />
          {Array.from({ length: nbColonnes }, (_, i) => (
            <div key={i} className="grid-col-header">
              <span>{i + 1}</span>
              {mode === 'edit' && nbColonnes > 1 && (
                <button className="header-del" onClick={() => removeColonne(i + 1)}>×</button>
              )}
            </div>
          ))}
          {mode === 'edit' && (
            <button
              className="grid-add-btn"
              onClick={() => updateGridSize(nbLignes, nbColonnes + 1)}
              disabled={nbColonnes >= 30}
              title="Ajouter une colonne"
            >+</button>
          )}
        </div>

        {/* Data rows */}
        {Array.from({ length: nbLignes }, (_, rowIdx) => {
          const ligne = rowIdx + 1;
          return (
            <div key={ligne} className="grid-row">
              <div className="grid-row-header">
                <span>{ligne}</span>
                {mode === 'edit' && nbLignes > 1 && (
                  <button className="header-del" onClick={() => removeLigne(ligne)}>×</button>
                )}
              </div>
              {Array.from({ length: nbColonnes }, (_, colIdx) => {
                const col            = colIdx + 1;
                const emp            = emplacements.find(e => e.ligne === ligne && e.colonne === col);
                const isDisabled     = emp?.disabled;
                const produitIds     = emp?.produitIds || [];
                const refs           = produitIds.map(id => ({ id, ref: produitsMap.get(id)?.reference || '???' }));
                const matchesSearch  = searchRef && refs.some(r => r.ref.toLowerCase().includes(lowerSearch));
                const isScrollTarget = scrollLigne === ligne && scrollColonne === col;

                return (
                  <div
                    key={`${ligne}-${col}`}
                    ref={isScrollTarget ? scrollTargetRef : null}
                    className={[
                      'cell',
                      isDisabled ? 'disabled' : '',
                      mode !== 'view' ? 'interactive' : '',
                      matchesSearch ? 'highlight' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => onCellClick(ligne, col)}
                  >
                    {refs.length > 0 ? (
                      <div className="cell-refs">
                        {refs.map(({ id, ref }) => (
                          <span
                            key={id}
                            className={`ref-tag ${mode === 'delete' ? 'deletable' : ''}`}
                            onClick={e => {
                              if (mode !== 'delete') return;
                              e.stopPropagation();
                              setDeleteModal({ emplacement: emp, produitId: id });
                            }}
                          >
                            {ref}
                            {mode === 'delete' && <span className="ref-x">×</span>}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Add row button */}
        {mode === 'edit' && (
          <div className="grid-add-row-wrap">
            <button
              className="grid-add-row-btn"
              onClick={() => updateGridSize(nbLignes + 1, nbColonnes)}
              disabled={nbLignes >= 30}
            >+ Ligne</button>
          </div>
        )}
      </div>
    );
  };

  if (!depot || !etage) return <div className="page"><p>Chargement...</p></div>;

  return (
    <div className="page etage-page">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/depot/${depotId}`)}>← Retour</button>
        <div className="header-titles">
          <span className="header-depot">{depot.name}</span>
          <h1>{etage.name}</h1>
        </div>
        <div className="grid-size-badge">{nbLignes}×{nbColonnes}</div>
      </div>

      {/* Search bar */}
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="input"
          type="text"
          placeholder="Rechercher une référence..."
          value={searchRef}
          onChange={e => setSearchRef(e.target.value)}
          style={{ paddingLeft: '42px' }}
        />
        {searchRef && (
          <button className="search-clear" onClick={() => setSearchRef('')}>×</button>
        )}
      </div>

      {/* Mode toolbar */}
      <div className="mode-bar">
        {[
          { key: 'view',   label: '👁 Voir' },
          { key: 'add',    label: '➕ Ajouter' },
          { key: 'delete', label: '➖ Retirer' },
          { key: 'edit',   label: '✏️ Éditer' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`mode-btn ${mode === key ? 'active' : ''}`}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode hint */}
      {mode !== 'view' && (
        <p className="mode-hint">
          {mode === 'add'    && 'Tapez sur une cellule pour y ajouter un produit.'}
          {mode === 'delete' && 'Tapez sur une référence pour la retirer.'}
          {mode === 'edit'   && 'Tapez + pour ajouter lignes/colonnes, × pour supprimer. Tapez une cellule pour la bloquer.'}
        </p>
      )}

      {/* Grid */}
      <div className="grid-scroll">
        {renderGrid()}
      </div>

      {/* Add product modal */}
      {addModal && (
        <Modal
          title={`Ajouter — E${addModal.ligne}-${addModal.colonne}`}
          onClose={() => setAddModal(null)}
        >
          <label className="label">Référence du produit</label>
          <input
            className="input"
            type="text"
            placeholder="ex: REF-001"
            value={addRef}
            onChange={e => setAddRef(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddProduit()}
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setAddModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleAddProduit} disabled={!addRef.trim()}>Ajouter</button>
          </div>
        </Modal>
      )}

      {/* Delete product confirmation */}
      {deleteModal && (
        <Modal title="Retirer ce produit ?" onClose={() => setDeleteModal(null)}>
          <p>Retirer <strong>{produitsMap.get(deleteModal.produitId)?.reference}</strong> de cet emplacement ?</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>Annuler</button>
            <button className="btn btn-danger" onClick={handleDeleteProduit}>Retirer</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default EtagePage;




