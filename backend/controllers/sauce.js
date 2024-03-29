const sauceModels = require('../models/sauce');
const fs = require('fs');

const { validateFilename, sauceDataValid, heatValid, idValid } = require('../middleware/sauceValidation');

/**
 * Middleware de création d'une sauce
 * @param req - On récupère une sauce, l'id de l'utilisateur, le protocole 'HTTP', l'hôte du serveur et le nom de l'image
 * @param res - Si l'enregistrement a été validé le status sera "Created" sinon en "Bad Request"
 */
exports.createSauce = (req, res) => {
    // Vérification de l'existence de req.body.sauce
    if (!req.body.sauce) {
        fs.unlink(`images/${validateFilename(req.file.filename)}`, () => {
            res.status(400).json({ error: 'Veuillez remplir les champs de la sauce' });
        });
        return;
    } else {
        const sauceObject = JSON.parse(req.body.sauce);
        delete sauceObject._id;
        const sauce = new sauceModels({
            ...sauceObject,
            imageUrl: `${req.protocol}://${req.get('host')}/images/${validateFilename(req.file.filename)}`,
            likes: 0,
            dislikes: 0,
            usersLiked: [],
            usersDisliked: []
        });
        sauce.save()
        .then(() => { res.status(201).json({ message: 'Sauce enregistré !' })})
        .catch(error => { res.status(400).json({ error })})
    }
}

/**
 * Middleware de récupération de toutes les sauces
 * @param res - Si on récupère toutes les sauces le status sera "OK" sinon "Not Found"
 */
exports.getAllSauces = (req, res) => {
    sauceModels.find()
        .then(sauces => res.status(200).json(sauces))
        .catch(error => res.status(404).json({ error }));
}

/**
 * Middleware de récupération d'une seule sauce
 * @param req - On récupère l'id d'une sauce
 * @param res 
 */
exports.getOneSauce = (req, res) => {
    const sauceId = idValid(req.params.id);

    sauceModels.findOne({
        _id: sauceId
    })
    .then(sauce => {
        res.status(200).json(sauce);
    })
    .catch(error => {
        res.status(404).json({ error: 'Sauce non trouvée' })
    })
}

/**
 * Middleware de modification d'une sauce
 * @param req - On récupère l'id puis l'ensemble des éléments du 'body'
 * @param res 
 */
exports.modifySauce = (req, res) => {
    sauceModels.findOne({ _id: idValid(req.params.id) })
        .then(sauce => {
            let sauceObject = {};
            if (req.file) {
                sauceObject = {
                    ...JSON.parse(req.body.sauce),
                    imageUrl: `${req.protocol}://${req.get('host')}/images/${validateFilename(req.file.filename)}`
                }
                try {
                    sauceDataValid(sauceObject);
                    heatValid(sauceObject.heat);
                    const filename = sauce.imageUrl.split('/images/')[1];
                    fs.unlink(`images/${validateFilename(filename)}`, () => {
                        sauceModels.updateOne({ _id: idValid(req.params.id) }, { ...sauceObject, _id: idValid(req.params.id) })
                            .then(() => res.status(200).json({ message: 'Sauce modifiée !' }))
                            .catch(error => res.status(400).json({ error }));
                    });
                } catch (error) {
                    fs.unlink(`images/${validateFilename(req.file.filename)}`, () => {
                        res.status(400).json({ error });
                    });
                }
            } else {
                sauceObject = { ...req.body };
                try {
                    sauceDataValid(sauceObject);
                    heatValid(sauceObject.heat);
                    sauceModels.updateOne({ _id: idValid(req.params.id) }, { ...sauceObject, _id: id })
                        .then(() => res.status(200).json({ message: 'Sauce modifiée !' }))
                        .catch(error => res.status(400).json({ error }));
                } catch (error) {
                    res.status(400).json({ error });
                }
            }
        })
        .catch(error => {
            fs.unlink(`images/${validateFilename(req.file.filename)}`, () => {
                res.status(400).json({ throw: 'Veuillez remplir tous les champs.' });
            });
        });
}

/**
 * Middleware de suppression d'une sauce
 * @param req - On récupère l'id et on fait une vérification entre l'id d'un utilisateur et celle de la sauce
 * @param res
 */
exports.deleteSauce = (req, res) => {
    sauceModels.findOne({ _id: idValid(req.params.id) })
    .then(sauce => {
        if (sauce.userId != req.auth.userId) {
            res.status(401).json({ message : 'Non-autorisé' });
        } 
        
        const filename = sauce.imageUrl.split('/images')[1];
        fs.unlink(`images/${validateFilename(filename)}`, () => {
            sauceModels.deleteOne({ _id: idValid(req.params.id) })
                .then(() => res.status(200).json({ message: 'Sauce supprimé !' }))
                .catch(error => res.status(401).json({ error }));
            });
    })
    
    .catch(error => { res.status(500).json({ error })})
}

/**
 * Middleware j'aime ou je n'aime pas une sauce
 * @param req - On récupère l'id de l'utilisateur, de la sauce et de 'like'
 * @param res
 */
exports.likesAndDislikes = (req, res) => {
    sauceModels.findOne({ _id: idValid(req.params.id) })
        .then(sauce => {
            switch(req.body.like) {
                // Vérification que l'utilisateur n'a pas déjà liké la sauce (n'existe pas dans le tableau des utilisateurs)
                case 1:
                    if (!sauce.usersLiked.includes(req.body.userId)) {
                        sauceModels.updateOne(
                            { _id: idValid(req.params.id) },
                            {
                                $inc: { likes: 1 },
                                $push: { usersLiked: req.body.userId }
                            }
                        )
                            .then(() => res.status(200).json({ message: "J'aime cette sauce !" }))
                            .catch((error) => res.status(400).json({ error }));
                    }
                    break;
                // Vérification que l'utilisateur n'a pas déjà disliké la sauce (n'existe pas dans le tableau des utilisateurs)
                case -1:
                    if (!sauce.usersDisliked.includes(req.body.userId)) {
                        sauceModels.updateOne(
                            { _id: idValid(req.params.id) },
                            {
                                $inc: { dislikes: 1 },
                                $push: { usersDisliked: req.body.userId }
                            }
                        )
                            .then(() => res.status(200).json({ message: "Je n'aime pas cette sauce !" }))
                            .catch((error) => res.status(400).json({ error }));
                    }
                    break;
                // Vérification que l'utilisateur n'a pas déjà liké ou disliké la sauce (existe dans le tableau des utilisateurs)
                case 0:
                    if (sauce.usersLiked.includes(req.body.userId)) {
                        sauceModels.updateOne(
                            { _id: idValid(req.params.id) },
                            {
                                $inc: { likes: -1 },
                                $pull: { usersLiked: req.body.userId }
                            }
                        )
                            .then(() => res.status(200).json({ message: "Votre 'j'aime' a bien été retiré" }))
                            .catch((error) => res.status(400).json({ error }));
                    }

                    if (sauce.usersDisliked.includes(req.body.userId)) {
                        sauceModels.updateOne(
                            { _id: idValid(req.params.id) },
                            {
                                $inc: { dislikes: -1 },
                                $pull: { usersDisliked: req.body.userId }
                            }
                        )
                            .then(() => res.status(200).json({ message: "Votre 'je n'aime pas' a bien été retiré" }))
                            .catch((error) => res.status(400).json({ error }));
                    }
                    break;
                default:
                    return new Error('Exception non gérée par le système');
            }
        })

        .catch(error => { res.status(500).json({ error })});
}