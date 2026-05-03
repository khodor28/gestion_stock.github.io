import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import db from '../db';
import './DepotPage.css';

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

const DepotPage = () => {
  const { depotId } = useParams();
  const navigate = useNavigate();
  const [depot, setDepot] = useState(null);
  const [etages, setEtages] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, [depotId]);

  const load = async () => {
    const d = await db.depots.get(Number(depotId));
    setDepot(d);
    const e = await db.etages.where('depotId').equals(Number(depotId)).toArray();
    setEtages(e);
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const exists = await db.etages
      .where({ depotId: Number(depotId) })
      .filter(e => e.name.toLowerCase() === name.toLowerCase())
      .first();
    if (exists) { flash('Ce nom existe déjà.', 'error'); return; }
    await db.etages.add({ name, depotId: Number(depotId) });
    setNewName('');
    setShowAdd(false);
    await load();
    flash('Étage ajouté !');
  };

  const handleDelete = async () => {
    const { id } = toDelete;
    await db.emplacements.where('etageId').equals(id).delete();
    await db.etages.delete(id);
    setToDelete(null);
    await load();
    flash('Étage supprimé.');
  };

  if (!depot) return (
    <div className="page"><p>Dépôt introuvable.</p></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Retour</button>
        <h1>{depot.name}</h1>
      </div>

      {etages.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📦</span>
          <p>Aucun étage</p>
          <p>Appuyez sur + pour créer le premier étage.</p>
        </div>
      ) : (
        <div className="etage-list">
          {etages.map(e => (
            <div key={e.id} className="etage-card card">
              <Link to={`/depot/${depotId}/etage/${e.id}`} className="etage-card-body">
                <span className="etage-icon-wrap">📦</span>
                <span className="etage-card-name">{e.name}</span>
                <span className="etage-chevron">›</span>
              </Link>
              <button className="btn-trash" onClick={() => setToDelete(e)} aria-label="Supprimer">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => { setShowAdd(true); setNewName(''); }}>＋</button>

      {showAdd && (
        <Modal title="Nouvel étage" onClose={() => setShowAdd(false)}>
          <label className="label">Nom de l'étage</label>
          <input
            className="input"
            type="text"
            placeholder="ex: Allée 1, Niveau A..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>Créer</button>
          </div>
        </Modal>
      )}

      {toDelete && (
        <Modal title="Supprimer cet étage ?" onClose={() => setToDelete(null)}>
          <p>Supprimer <strong>{toDelete.name}</strong> ? Tous les emplacements seront supprimés.</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Annuler</button>
            <button className="btn btn-danger" onClick={handleDelete}>Supprimer</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default DepotPage;
