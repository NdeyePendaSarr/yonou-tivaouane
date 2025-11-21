// controllers/sous-localites.controller.js
const db = require('../config/database'); // Votre connexion PostgreSQL

/**
 * Récupérer toutes les sous-localités (A, B, C, D, E)
 */
const getAllSousLocalites = async (req, res) => {
  try {
    const query = `
      SELECT 
        sl.*,
        COUNT(DISTINCT s.id) as nombre_sections,
        COUNT(DISTINCT d.id) as nombre_deplacements,
        COUNT(DISTINCT c.id) as nombre_cars,
        COALESCE(SUM(c.nombre_passagers), 0) as total_passagers
      FROM sous_localites sl
      LEFT JOIN sections s ON s.sous_localite_id = sl.id AND s.is_active = true
      LEFT JOIN deplacements d ON d.section_id = s.id
      LEFT JOIN cars c ON c.deplacement_id = d.id
      GROUP BY sl.id
      ORDER BY sl.ordre_affichage ASC
    `;

    const result = await db.query(query);

    res.status(200).json({
      success: true,
      data: {
        sousLocalites: result.rows
      }
    });
  } catch (error) {
    console.error('Erreur get all sous-localités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sous-localités',
      error: error.message
    });
  }
};

/**
 * Récupérer une sous-localité par ID
 */
const getSousLocaliteById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sl.*,
        COUNT(DISTINCT s.id) as nombre_sections
      FROM sous_localites sl
      LEFT JOIN sections s ON s.sous_localite_id = sl.id AND s.is_active = true
      WHERE sl.id = $1
      GROUP BY sl.id
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur get sous-localité by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la sous-localité',
      error: error.message
    });
  }
};

/**
 * Récupérer les statistiques détaillées d'une sous-localité
 */
const getSousLocaliteStats = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sl.id,
        sl.code,
        sl.nom,
        COUNT(DISTINCT s.id) as nombre_sections,
        COUNT(DISTINCT d.id) as nombre_deplacements,
        COUNT(DISTINCT c.id) as nombre_cars,
        COALESCE(SUM(c.nombre_passagers), 0) as total_passagers,
        COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN c.id END) as cars_avec_incidents,
        COUNT(DISTINCT CASE WHEN c.statut_temps_reel = 'Arrivé à Tivaouane' OR c.statut_temps_reel = 'Arrivé à Mbour' THEN c.id END) as cars_arrives,
        COUNT(DISTINCT CASE WHEN c.statut_temps_reel = 'En route' OR c.statut_temps_reel = 'En route vers Mbour' THEN c.id END) as cars_en_route,
        COUNT(DISTINCT CASE WHEN c.alerte_retard = true THEN c.id END) as cars_en_retard
      FROM sous_localites sl
      LEFT JOIN sections s ON s.sous_localite_id = sl.id AND s.is_active = true
      LEFT JOIN deplacements d ON d.section_id = s.id
      LEFT JOIN cars c ON c.deplacement_id = d.id
      LEFT JOIN incidents i ON i.car_id = c.id AND i.statut_resolution = 'En cours'
      WHERE sl.id = $1
      GROUP BY sl.id, sl.code, sl.nom
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur get sous-localité stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

/**
 * Récupérer les sections d'une sous-localité
 */
const getSectionsBySousLocalite = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.*,
        sl.code as sous_localite_code,
        sl.nom as sous_localite_nom,
        COUNT(DISTINCT d.id) as nombre_deplacements,
        COUNT(DISTINCT c.id) as nombre_cars
      FROM sections s
      INNER JOIN sous_localites sl ON sl.id = s.sous_localite_id
      LEFT JOIN deplacements d ON d.section_id = s.id
      LEFT JOIN cars c ON c.deplacement_id = d.id
      WHERE s.sous_localite_id = $1
      GROUP BY s.id, sl.code, sl.nom
      ORDER BY s.ordre_affichage ASC
    `;

    const result = await db.query(query, [id]);

    res.status(200).json({
      success: true,
      data: {
        sections: result.rows
      }
    });
  } catch (error) {
    console.error('Erreur get sections by sous-localité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sections',
      error: error.message
    });
  }
};

module.exports = {
  getAllSousLocalites,
  getSousLocaliteById,
  getSousLocaliteStats,
  getSectionsBySousLocalite
};