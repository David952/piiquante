const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const limiter = require('../middleware/rateLimiter');

const sauceCtrl = require('../controllers/sauce');

router.use(limiter);

// On définit le chemin, on ajoute nos middlewares puis on appelle le fichier 'sauce' avec ses fonctions dans le dossier 'controllers'
router.post('/', auth, multer, sauceCtrl.createSauce);
router.get('/', auth, sauceCtrl.getAllSauces);
router.get('/:id', auth, sauceCtrl.getOneSauce);
router.put('/:id', auth, multer, sauceCtrl.modifySauce);
router.delete('/:id', auth, sauceCtrl.deleteSauce);
router.post('/:id/like', auth, sauceCtrl.likesAndDislikes);

module.exports = router;