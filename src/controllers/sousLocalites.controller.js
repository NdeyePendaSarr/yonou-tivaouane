// ==========================================
// FICHIER : backend/controllers/sousLocalites.controller.js
// ==========================================

const pool = require('../config/database');

/**
 * Récupérer toutes les sous-localités avec statistiques
 */
exports.getAll = async (req, res) => {
  try {
    const { edition_id } = req.query;

    let query = `
      SELECT 
        sl.id,
        sl.code,
        sl.nom,
        sl.description,
        sl.ordre_affichage,
        sl.created_at,
        sl.updated_at,
        COUNT(DISTINCT s.id) as nombre_sections,
        COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true) as sections_actives
      FROM sous_localites sl
      LEFT JOIN sections s ON s.sous_localite_id = sl.id
      GROUP BY sl.id, sl.code, sl.nom, sl.description, sl.ordre_affichage, sl.created_at, sl.updated_at
      ORDER BY sl.ordre_affichage ASC
    `;

    const result = await pool.query(query);

    // Si une édition est spécifiée, récupérer les stats détaillées
    if (edition_id) {
      const statsQuery = `
        SELECT * FROM v_stats_sous_localites
        WHERE edition_id = $1
        ORDER BY sous_localite_code
      `;
      const statsResult = await pool.query(statsQuery, [edition_id]);

      // Fusionner les stats avec les sous-localités
      const sousLocalitesWithStats = result.rows.map(sl => {
        const stats = statsResult.rows.find(s => s.sous_localite_code === sl.code);
        return {
          ...sl,
          stats: stats || {
            nombre_deplacements: 0,
            nombre_cars: 0,
            total_passagers: 0,
            cars_avec_incidents: 0
          }
        };
      });

      return res.status(200).json({
        success: true,
        data: sousLocalitesWithStats,
        count: sousLocalitesWithStats.length
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des sous-localités:', error);
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
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sl.*,
        COUNT(DISTINCT s.id) as nombre_sections,
        COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true) as sections_actives,
        json_agg(
          json_build_object(
            'id', s.id,
            'nom', s.nom,
            'is_active', s.is_active,
            'president_nom', s.president_nom,
            'president_telephone', s.president_telephone
          ) ORDER BY s.ordre_affichage
        ) FILTER (WHERE s.id IS NOT NULL) as sections
      FROM sous_localites sl
      LEFT JOIN sections s ON s.sous_localite_id = sl.id
      WHERE sl.id = $1
      GROUP BY sl.id
    `;

    const result = await pool.query(query, [id]);

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
    console.error('Erreur lors de la récupération de la sous-localité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la sous-localité',
      error: error.message
    });
  }
};

/**
 * Créer une nouvelle sous-localité
 */
exports.create = async (req, res) => {
  try {
    const { code, nom, description, ordre_affichage } = req.body;

    // Validation
    if (!code || !nom || !ordre_affichage) {
      return res.status(400).json({
        success: false,
        message: 'Les champs code, nom et ordre_affichage sont obligatoires'
      });
    }

    // Vérifier que le code est valide (A-Z)
    if (!/^[A-Z]$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit être une lettre majuscule unique (A-Z)'
      });
    }

    // Vérifier que le code n'existe pas déjà
    const checkQuery = 'SELECT id FROM sous_localites WHERE code = $1';
    const checkResult = await pool.query(checkQuery, [code]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Une sous-localité avec le code "${code}" existe déjà`
      });
    }

    const query = `
      INSERT INTO sous_localites (code, nom, description, ordre_affichage)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [code, nom, description, ordre_affichage]);

    res.status(201).json({
      success: true,
      message: 'Sous-localité créée avec succès',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la création de la sous-localité:', error);
    
    if (error.code === '23505') { // Violation de contrainte unique
      return res.status(409).json({
        success: false,
        message: 'Cette sous-localité existe déjà'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la sous-localité',
      error: error.message
    });
  }
};

/**
 * Mettre à jour une sous-localité
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, ordre_affichage } = req.body;

    // Vérifier que la sous-localité existe
    const checkQuery = 'SELECT id FROM sous_localites WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité non trouvée'
      });
    }

    const query = `
      UPDATE sous_localites
      SET 
        nom = COALESCE($1, nom),
        description = COALESCE($2, description),
        ordre_affichage = COALESCE($3, ordre_affichage),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [nom, description, ordre_affichage, id]);

    res.status(200).json({
      success: true,
      message: 'Sous-localité mise à jour avec succès',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la sous-localité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la sous-localité',
      error: error.message
    });
  }
};

/**
 * Supprimer une sous-localité
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si la sous-localité a des sections
    const checkQuery = 'SELECT COUNT(*) as count FROM sections WHERE sous_localite_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer cette sous-localité car elle contient des sections'
      });
    }

    const query = 'DELETE FROM sous_localites WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Sous-localité supprimée avec succès',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la sous-localité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la sous-localité',
      error: error.message
    });
  }
};

/**
 * Récupérer les statistiques détaillées par sous-localité pour une édition
 */
exports.getStatsByEdition = async (req, res) => {
  try {
    const { edition_id } = req.params;

    const query = `
      SELECT 
        sl.id,
        sl.code,
        sl.nom,
        COALESCE(stats.nombre_sections, 0) as nombre_sections,
        COALESCE(stats.nombre_deplacements, 0) as nombre_deplacements,
        COALESCE(stats.nombre_cars, 0) as nombre_cars,
        COALESCE(stats.total_passagers, 0) as total_passagers,
        COALESCE(stats.cars_avec_incidents, 0) as cars_avec_incidents,
        -- Stats détaillées par type de déplacement
        COALESCE(
          (SELECT COUNT(*) FROM deplacements d 
           JOIN sections s ON d.section_id = s.id 
           WHERE s.sous_localite_id = sl.id 
           AND d.edition_id = $1 
           AND d.type = 'ALLER'), 0
        ) as deplacements_aller,
        COALESCE(
          (SELECT COUNT(*) FROM deplacements d 
           JOIN sections s ON d.section_id = s.id 
           WHERE s.sous_localite_id = sl.id 
           AND d.edition_id = $1 
           AND d.type = 'RETOUR'), 0
        ) as deplacements_retour,
        -- Stats par statut
        COALESCE(
          (SELECT COUNT(*) FROM cars c
           JOIN deplacements d ON c.deplacement_id = d.id
           JOIN sections s ON d.section_id = s.id
           WHERE s.sous_localite_id = sl.id
           AND d.edition_id = $1
           AND c.statut_temps_reel = 'En route'), 0
        ) as cars_en_route,
        COALESCE(
          (SELECT COUNT(*) FROM cars c
           JOIN deplacements d ON c.deplacement_id = d.id
           JOIN sections s ON d.section_id = s.id
           WHERE s.sous_localite_id = sl.id
           AND d.edition_id = $1
           AND c.statut_temps_reel IN ('Arrivé à Tivaouane', 'Arrivé à Mbour')), 0
        ) as cars_arrives
      FROM sous_localites sl
      LEFT JOIN v_stats_sous_localites stats 
        ON stats.sous_localite_code = sl.code 
        AND stats.edition_id = $1
      ORDER BY sl.ordre_affichage
    `;

    const result = await pool.query(query, [edition_id]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};