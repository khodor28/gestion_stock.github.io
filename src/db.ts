import Dexie from "dexie";

// 1️⃣ Définition des interfaces
export interface Depot {
  id?: number;
  name: string;
}

export interface Etage {
  id?: number;
  name: string;
  depotId: number;
}

export interface Emplacement {
  id?: number;
  name: string;
  depotId: number;
  etageId: number;
  row?: number;
  col?: number;
  special?: string; // ex: "full-width"
}

export interface Produit {
  id?: number;
  reference: string;
  name: string;
}

export interface StockEmplacement {
  id?: number;
  produitId: number;
  emplacementId: number;
  quantite: number;
}

// 2️⃣ Création de la classe Dexie
class GestionStockDB extends Dexie {
  depots!: Dexie.Table<Depot, number>;
  etages!: Dexie.Table<Etage, number>;
  emplacements!: Dexie.Table<Emplacement, number>;
  produits!: Dexie.Table<Produit, number>;
  stockEmplacements!: Dexie.Table<StockEmplacement, number>;

  constructor() {
    super("GestionStockDB");

    this.version(1).stores({
      depots: "++id, name",
      etages: "++id, name, depotId",
      emplacements: "++id, name, depotId, etageId, row, col",
      produits: "++id, reference",
      stockEmplacements: "++id, produitId, emplacementId",
    });
  }
}

// 3️⃣ Exporter l'instance
const db = new GestionStockDB();
export default db;
