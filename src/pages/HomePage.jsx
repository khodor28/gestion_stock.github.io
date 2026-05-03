import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import db from '../db';
import './HomePage.css';

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

const HomePage = () => {
  const [depots, setDepots] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setDepots(await db.depots.toArray());
  };

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const exists = await db.depots.where('name').equalsIgnoreCase(name).first();
    if (exists) { flash('Ce nom existe déjà.', 'error'); return; }
    await db.depots.add({ name });
    setNewName('');
    setShowAdd(false);
    await load();
    flash('Dépôt créé !');
  };

  const handleDelete = async () => {
    const { id } = toDelete;
    const etages = await db.etages.where('depotId').equals(id).toArray();
    for (const e of etages) {
      await db.emplacements.where('etageId').equals(e.id).delete();
    }
    await db.etages.where('depotId').equals(id).delete();
    await db.depots.delete(id);
    setToDelete(null);
    await load();
    flash('Dépôt supprimé.');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mes Dépôts</h1>
        <span className="depot-count">{depots.length} dépôt{depots.length !== 1 ? 's' : ''}</span>
      </div>

      {depots.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">🏭</span>
          <p>Aucun dépôt</p>
          <p>Appuyez sur + pour créer votre premier dépôt.</p>
        </div>
      ) : (
        <div className="depot-list">
          {depots.map(d => (
            <div key={d.id} className="depot-card card">
              <Link to={`/depot/${d.id}`} className="depot-card-body">
                <span className="depot-icon-wrap">🏭</span>
                <span className="depot-card-name">{d.name}</span>
                <span className="depot-chevron">›</span>
              </Link>
              <button className="btn-trash" onClick={() => setToDelete(d)} aria-label="Supprimer">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => { setShowAdd(true); setNewName(''); }}>＋</button>

      {showAdd && (
        <Modal title="Nouveau dépôt" onClose={() => setShowAdd(false)}>
          <label className="label">Nom du dépôt</label>
          <input
            className="input"
            type="text"
            placeholder="ex: Entrepôt A"
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
        <Modal title="Supprimer ce dépôt ?" onClose={() => setToDelete(null)}>
          <p>Voulez-vous supprimer <strong>{toDelete.name}</strong> ? Tous ses étages et emplacements seront supprimés.</p>
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

export default HomePage;
