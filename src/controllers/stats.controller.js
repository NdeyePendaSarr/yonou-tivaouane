// @desc    Statistiques globales du dashboard
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Récupérer l'édition active
    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!activeEdition) {
      return res.status(200).json({
        success: true,
        message: 'Aucune édition active',
        data: {
          total_sections: 31,
          total_deplacements: 0,
          total_cars: 0,
          total_passagers: 0,
          incidents_en_cours: 0,
          cars_en_route: 0
        }
      });
    }

    // Compter les sections
    const totalSections = await Section.count({
      where: { is_active: true }
    });

    // Compter les déplacements
    const totalDeplacements = await Deplacement.count({
      where: { edition_id: activeEdition.id }
    });

    // Récupérer tous les cars de l'édition
    const cars = await Car.findAll({
      include: [{
        model: Deplacement,
        as: 'deplacement',
        where: { edition_id: activeEdition.id },
        attributes: ['id']
      }],
      attributes: ['id', 'nombre_passagers', 'statut_temps_reel', 'alerte_retard']
    });

    const totalCars = cars.length;
    const totalPassagers = cars.reduce((sum, car) => sum + (car.nombre_passagers || 0), 0);
    const carsEnRoute = cars.filter(c => 
      c.statut_temps_reel === 'En route' || 
      c.statut_temps_reel === 'En route vers Mbour'
    ).length;
    const carsEnRetard = cars.filter(c => c.alerte_retard === true).length;

    // Compter les incidents en cours
    const incidents = await Incident.findAll({
      include: [{
        model: Car,
        as: 'car',
        include: [{
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id: activeEdition.id },
          attributes: ['id']
        }],
        attributes: ['id']
      }],
      where: { statut_resolution: 'En cours' },
      attributes: ['id']
    });

    const incidentsEnCours = incidents.length;

    res.status(200).json({
      success: true,
      data: {
        total_sections: totalSections,
        total_deplacements: totalDeplacements,
        total_cars: totalCars,
        total_passagers: totalPassagers,
        incidents_en_cours: incidentsEnCours,
        cars_en_route: carsEnRoute,
        cars_en_retard: carsEnRetard,
        edition_active: {
          id: activeEdition.id,
          annee: activeEdition.annee
        }
      }
    });

  } catch (error) {
    logger.error('Erreur getDashboardStats:', error);
    console.error('Détails erreur:', error); // Pour voir l'erreur exacte
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message // Temporaire pour debugging
    });
  }
};